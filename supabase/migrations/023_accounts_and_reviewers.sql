BEGIN;
ALTER TABLE public.profile DROP CONSTRAINT profile_role_check;
ALTER TABLE public.profile ADD CONSTRAINT profile_role_check CHECK(role IN ('user','reviewer','admin'));
ALTER TABLE public.profile ADD COLUMN favourite_town text;
CREATE OR REPLACE FUNCTION public.is_profile_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT public.can_write_pilot_draft() AND EXISTS(SELECT 1 FROM public.profile WHERE id=auth.uid() AND role='admin' AND eligibility='eligible'); $$;
CREATE FUNCTION public.can_review_parking() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT public.can_write_pilot_draft() AND EXISTS(SELECT 1 FROM public.profile WHERE id=auth.uid() AND role IN ('admin','reviewer') AND eligibility='eligible'); $$;
REVOKE ALL ON FUNCTION public.can_review_parking() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_review_parking() TO authenticated;
DROP POLICY pilot_submission_read ON public.pilot_submission;
CREATE POLICY pilot_submission_read ON public.pilot_submission FOR SELECT TO authenticated USING(public.can_write_pilot_draft() AND(owner_id=auth.uid() OR public.can_review_parking()));
CREATE FUNCTION public.save_profile_settings(alias text,town text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF auth.uid() IS NULL OR length(trim(alias)) NOT BETWEEN 1 AND 80 OR town IS NULL OR town NOT IN ('carnegie','chadstone','bentleigh','brighton','malvern','oakleigh','clayton','springvale','mulgrave','clayton-south','moorabbin','hampton','st-kilda','glen-waverley','malvern-east','oakleigh-south','hawthorn') THEN RAISE EXCEPTION 'Invalid settings'; END IF;
 UPDATE public.profile SET public_alias=trim(alias),favourite_town=town WHERE id=auth.uid();
END; $$;
CREATE TABLE public.profile_permission_event(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,actor_id uuid NOT NULL,target_id uuid NOT NULL,previous_role text NOT NULL,new_role text NOT NULL,previous_eligibility text NOT NULL,new_eligibility text NOT NULL,changed_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.profile_permission_event ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profile_permission_event FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.profile_permission_event TO authenticated;
CREATE POLICY permission_history_admin ON public.profile_permission_event FOR SELECT TO authenticated USING(public.is_profile_admin());
CREATE FUNCTION public.manage_profile_permissions(target uuid,new_role text,new_eligibility text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE previous public.profile; BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('parkmel-permissions',0));
 IF NOT public.can_write_pilot_draft() OR NOT public.is_profile_admin() THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
 IF new_role NOT IN ('user','reviewer','admin') OR new_eligibility NOT IN ('eligible','unverified','suspended') THEN RAISE EXCEPTION 'Invalid permissions'; END IF;
 IF target=auth.uid() THEN RAISE EXCEPTION 'Cannot change your own permissions'; END IF;
 IF new_eligibility='eligible' AND NOT EXISTS(SELECT 1 FROM auth.users WHERE id=target AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Confirmed email required'; END IF;
 SELECT * INTO previous FROM public.profile WHERE id=target FOR UPDATE;
 UPDATE public.profile SET role=new_role,eligibility=new_eligibility WHERE id=target;
 IF NOT FOUND THEN RAISE EXCEPTION 'User missing'; END IF;
 INSERT INTO public.profile_permission_event(actor_id,target_id,previous_role,new_role,previous_eligibility,new_eligibility) VALUES(auth.uid(),target,previous.role,new_role,previous.eligibility,new_eligibility);
END; $$;
CREATE OR REPLACE FUNCTION public.review_pilot_annotation_current(submission uuid,decision text,reason text,expected_revision uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item public.pilot_submission;current_revision uuid;current_payload jsonb;identical boolean;
BEGIN
 IF NOT public.can_review_parking() THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501';END IF;
 IF (decision IN('approve','reject') AND length(coalesce(reason,''))<=2000) IS NOT TRUE THEN RAISE EXCEPTION 'Valid decision and optional reason required';END IF;
 SELECT * INTO item FROM public.pilot_submission WHERE id=submission;
 IF item.id IS NULL THEN RAISE EXCEPTION 'Submission missing';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(item.section_id::text,0));
 SELECT * INTO item FROM public.pilot_submission WHERE id=submission FOR UPDATE;
 IF item.status=(CASE WHEN decision='approve' THEN 'approved' ELSE 'rejected' END) THEN RETURN;END IF;
 IF item.status<>'pending' THEN RAISE EXCEPTION 'Already reviewed with another decision' USING ERRCODE='40001';END IF;
 SELECT pub.submission_id,a.payload INTO current_revision,current_payload FROM public.pilot_publication pub JOIN public.pilot_submission a ON a.id=pub.submission_id WHERE pub.section_id=item.section_id;
 IF decision='approve' THEN
  IF NOT public.validate_pilot_payload(item.payload,item.section_id) THEN RAISE EXCEPTION 'Invalid payload';END IF;
  identical:=current_revision IS NOT NULL AND public.pilot_semantic_content(current_payload)=public.pilot_semantic_content(item.payload);
  IF NOT identical THEN
   IF current_revision IS DISTINCT FROM expected_revision THEN RAISE EXCEPTION 'Published rules changed since the displayed comparison; reload before approving' USING ERRCODE='40001';END IF;
   INSERT INTO public.pilot_publication VALUES(item.section_id,item.id,'admin_verified',now()) ON CONFLICT(section_id) DO UPDATE SET submission_id=EXCLUDED.submission_id,verification=EXCLUDED.verification,verified_at=EXCLUDED.verified_at;
  END IF;
 END IF;
 UPDATE public.pilot_submission SET status=CASE WHEN decision='approve' THEN 'approved' ELSE 'rejected' END WHERE id=item.id;
 INSERT INTO public.pilot_review_event(submission_id,actor_id,decision,reason) VALUES(item.id,auth.uid(),decision,trim(coalesce(reason,'')));
END;$$;

CREATE FUNCTION public.submit_and_approve_parking(p jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE submission uuid; current_revision uuid; BEGIN
 IF NOT public.can_review_parking() THEN RAISE EXCEPTION 'Reviewer required' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p->>'sectionId',0));
 SELECT submission_id INTO current_revision FROM public.pilot_publication WHERE section_id=(p->>'sectionId')::uuid;
 submission:=public.submit_pilot_annotation(p);
 PERFORM public.review_pilot_annotation_current(submission,'approve','Direct publication by reviewer',current_revision);
 RETURN submission;
END; $$;
REVOKE ALL ON FUNCTION public.save_profile_settings(text,text),public.manage_profile_permissions(uuid,text,text),public.submit_and_approve_parking(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_profile_settings(text,text),public.manage_profile_permissions(uuid,text,text),public.submit_and_approve_parking(jsonb) TO authenticated;
CREATE FUNCTION public.list_managed_users() RETURNS TABLE(id uuid,public_alias text,role text,eligibility text,email text,email_confirmed boolean) LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF NOT public.can_write_pilot_draft() OR NOT public.is_profile_admin() THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT p.id,p.public_alias,p.role,p.eligibility,u.email,u.email_confirmed_at IS NOT NULL FROM public.profile p JOIN auth.users u ON u.id=p.id ORDER BY p.public_alias,p.id LIMIT 500;
END; $$;
REVOKE ALL ON FUNCTION public.list_managed_users() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.list_managed_users() TO authenticated;
COMMIT;
