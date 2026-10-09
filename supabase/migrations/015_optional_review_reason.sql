-- Optional admin notes; review authorization and audit events remain mandatory.
CREATE OR REPLACE FUNCTION public.review_pilot_annotation(submission uuid,decision text,reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item public.pilot_submission;current_revision uuid;
BEGIN
 IF NOT public.can_write_pilot_draft() OR NOT public.is_profile_admin() THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501';END IF;
 IF (decision IN('approve','reject') AND length(coalesce(reason,'')) <= 2000) IS NOT TRUE THEN RAISE EXCEPTION 'Valid decision and optional reason required';END IF;
 SELECT * INTO item FROM public.pilot_submission WHERE id=submission;
 IF item.id IS NULL THEN RAISE EXCEPTION 'Submission missing';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(item.section_id::text,0));
 SELECT * INTO item FROM public.pilot_submission WHERE id=submission FOR UPDATE;
 IF item.status<>'pending' THEN RAISE EXCEPTION 'Already reviewed';END IF;
 SELECT submission_id INTO current_revision FROM public.pilot_publication WHERE section_id=item.section_id;
 IF decision='approve' THEN
  IF current_revision IS DISTINCT FROM item.base_revision OR NOT public.validate_pilot_payload(item.payload,item.section_id) THEN RAISE EXCEPTION 'Section changed or invalid payload: review a fresh submission';END IF;
  INSERT INTO public.pilot_publication VALUES(item.section_id,item.id,'admin_verified',now()) ON CONFLICT(section_id) DO UPDATE SET submission_id=EXCLUDED.submission_id,verification=EXCLUDED.verification,verified_at=EXCLUDED.verified_at;
 END IF;
 UPDATE public.pilot_submission SET status=CASE WHEN decision='approve' THEN 'approved' ELSE 'rejected' END WHERE id=item.id;
 INSERT INTO public.pilot_review_event(submission_id,actor_id,decision,reason) VALUES(item.id,auth.uid(),decision,trim(coalesce(reason,'')));
END;$$;
