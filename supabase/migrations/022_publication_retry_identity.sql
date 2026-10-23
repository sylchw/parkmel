BEGIN;
CREATE OR REPLACE FUNCTION public.submit_pilot_annotation(p jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s uuid;h text;submission uuid;current_revision uuid;current_payload jsonb;voters uuid[];publish_revision uuid;
BEGIN
 IF NOT public.can_write_pilot_draft() THEN RAISE EXCEPTION 'Confirmed eligible account required' USING ERRCODE='42501';END IF;
 s:=(p->>'sectionId')::uuid;
 IF NOT public.validate_pilot_payload(p,s) OR NOT EXISTS(SELECT 1 FROM public.pilot_street_side WHERE id=s AND side=p->>'side' AND start_description=p->>'startDescription' AND end_description=p->>'endDescription') THEN RAISE EXCEPTION 'Invalid complete annotation or geometry';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(s::text,0));
 SELECT pub.submission_id,a.payload INTO current_revision,current_payload FROM public.pilot_publication pub JOIN public.pilot_submission a ON a.id=pub.submission_id WHERE pub.section_id=s;
 h:=public.pilot_semantic_hash(p);
 -- An automatic publication can change the revision during the first request.
 -- Repeating that same request must not create another contribution or reward.
 IF current_revision IS NOT NULL AND public.pilot_semantic_content(current_payload)=public.pilot_semantic_content(p) THEN
  SELECT id INTO submission FROM public.pilot_submission WHERE section_id=s AND owner_id=auth.uid() AND content_hash=h AND public.pilot_semantic_content(payload)=public.pilot_semantic_content(p) AND status IN('pending','approved') ORDER BY (status='approved') DESC,submitted_at DESC LIMIT 1;
  IF submission IS NOT NULL THEN RETURN submission;END IF;
 END IF;
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
COMMIT;
