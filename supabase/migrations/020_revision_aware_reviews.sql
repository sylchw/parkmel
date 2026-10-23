BEGIN;
-- One retry-safe contribution per account, interpretation and observed publication.
ALTER TABLE public.pilot_submission DROP CONSTRAINT pilot_submission_section_id_owner_id_content_hash_key;
ALTER TABLE public.pilot_submission ADD CONSTRAINT pilot_submission_revision_identity UNIQUE NULLS NOT DISTINCT(section_id,owner_id,content_hash,base_revision);
CREATE OR REPLACE FUNCTION public.submit_pilot_annotation(p jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s uuid;h text;submission uuid;current_revision uuid;current_payload jsonb;voters uuid[];publish_revision uuid;
BEGIN
 IF NOT public.can_write_pilot_draft() THEN RAISE EXCEPTION 'Confirmed eligible account required' USING ERRCODE='42501';END IF;
 s:=(p->>'sectionId')::uuid;
 IF NOT public.validate_pilot_payload(p,s) OR NOT EXISTS(SELECT 1 FROM public.pilot_street_side WHERE id=s AND side=p->>'side' AND start_description=p->>'startDescription' AND end_description=p->>'endDescription') THEN RAISE EXCEPTION 'Invalid complete annotation or geometry';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(s::text,0));
 SELECT pub.submission_id,a.payload INTO current_revision,current_payload FROM public.pilot_publication pub JOIN public.pilot_submission a ON a.id=pub.submission_id WHERE pub.section_id=s;
 h:=public.pilot_semantic_hash(p);
 INSERT INTO public.pilot_submission(section_id,owner_id,payload,content_hash,base_revision) VALUES(s,auth.uid(),p,h,current_revision) ON CONFLICT ON CONSTRAINT pilot_submission_revision_identity DO NOTHING RETURNING id INTO submission;
 IF submission IS NULL THEN SELECT id INTO submission FROM public.pilot_submission WHERE section_id=s AND owner_id=auth.uid() AND content_hash=h AND base_revision IS NOT DISTINCT FROM current_revision;RETURN submission;END IF;
 SELECT array_agg(a.id) INTO voters FROM public.pilot_submission a JOIN public.profile pr ON pr.id=a.owner_id JOIN auth.users u ON u.id=pr.id
 WHERE a.section_id=s AND a.content_hash=h AND public.pilot_semantic_content(a.payload)=public.pilot_semantic_content(p) AND a.status='pending' AND a.base_revision IS NOT DISTINCT FROM current_revision AND pr.eligibility='eligible' AND u.email_confirmed_at IS NOT NULL
 AND NOT EXISTS(SELECT 1 FROM public.pilot_submission b WHERE b.section_id=s AND b.owner_id=a.owner_id AND b.status='pending' AND b.base_revision IS NOT DISTINCT FROM current_revision AND b.content_hash<>h);
 IF coalesce(cardinality(voters),0)>=5 THEN
  publish_revision:=CASE WHEN submission=ANY(voters) THEN submission ELSE voters[1] END;
  IF current_revision IS NULL OR public.pilot_semantic_content(current_payload) IS DISTINCT FROM public.pilot_semantic_content(p) THEN
   INSERT INTO public.pilot_publication VALUES(s,publish_revision,'community_verified',now()) ON CONFLICT(section_id) DO UPDATE SET submission_id=EXCLUDED.submission_id,verification=EXCLUDED.verification,verified_at=EXCLUDED.verified_at;
  END IF;
  UPDATE public.pilot_submission SET status='approved' WHERE id=ANY(voters);
  INSERT INTO public.pilot_review_event(submission_id,decision,reason) VALUES(publish_revision,'community_verified','Five distinct confirmed eligible accounts agreed on the current revision');
 END IF;
 RETURN submission;
END;$$;
-- The caller supplies the exact publication displayed in the admin comparison.
CREATE FUNCTION public.review_pilot_annotation_current(submission uuid,decision text,reason text,expected_revision uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item public.pilot_submission;current_revision uuid;current_payload jsonb;identical boolean;
BEGIN
 IF NOT public.can_write_pilot_draft() OR NOT public.is_profile_admin() THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501';END IF;
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
REVOKE ALL ON FUNCTION public.review_pilot_annotation_current(uuid,text,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_pilot_annotation_current(uuid,text,text,uuid) TO authenticated;
-- Legacy clients retain their original revision check, with safe duplicate retries.
CREATE OR REPLACE FUNCTION public.review_pilot_annotation(submission uuid,decision text,reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE base uuid;
BEGIN
 SELECT base_revision INTO base FROM public.pilot_submission WHERE id=submission;
 PERFORM public.review_pilot_annotation_current(submission,decision,reason,base);
END;$$;
COMMIT;
