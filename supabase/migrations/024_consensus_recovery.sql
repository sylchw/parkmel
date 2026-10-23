BEGIN;
CREATE FUNCTION public.refresh_parking_consensus(section uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE revision uuid;published jsonb;candidate record;voters uuid[];representative uuid;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(section::text,0));
 SELECT pub.submission_id,a.payload INTO revision,published FROM public.pilot_publication pub JOIN public.pilot_submission a ON a.id=pub.submission_id WHERE pub.section_id=section;
 FOR candidate IN SELECT DISTINCT content_hash,public.pilot_semantic_content(payload) AS content FROM public.pilot_submission WHERE section_id=section AND status='pending' AND base_revision IS NOT DISTINCT FROM revision LOOP
  SELECT array_agg(a.id ORDER BY a.submitted_at,a.id) INTO voters FROM public.pilot_submission a JOIN public.profile pr ON pr.id=a.owner_id JOIN auth.users u ON u.id=pr.id
  WHERE public.validate_pilot_payload(a.payload,section) AND a.section_id=section AND a.status='pending' AND a.base_revision IS NOT DISTINCT FROM revision AND a.content_hash=candidate.content_hash AND public.pilot_semantic_content(a.payload)=candidate.content AND pr.eligibility='eligible' AND u.email_confirmed_at IS NOT NULL
  AND NOT EXISTS(SELECT 1 FROM public.pilot_submission b WHERE b.section_id=section AND b.owner_id=a.owner_id AND b.status='pending' AND b.base_revision IS NOT DISTINCT FROM revision AND b.content_hash<>candidate.content_hash);
  IF coalesce(cardinality(voters),0)>=5 THEN
   representative:=voters[1];
   IF revision IS NULL OR public.pilot_semantic_content(published) IS DISTINCT FROM candidate.content THEN
    INSERT INTO public.pilot_publication VALUES(section,representative,'community_verified',now()) ON CONFLICT(section_id) DO UPDATE SET submission_id=EXCLUDED.submission_id,verification=EXCLUDED.verification,verified_at=EXCLUDED.verified_at;
   END IF;
   UPDATE public.pilot_submission SET status='approved' WHERE id=ANY(voters);
   INSERT INTO public.pilot_review_event(submission_id,decision,reason) VALUES(representative,'community_verified','Five matching confirmed accounts after conflicting proposal resolved');
   RETURN;
  END IF;
 END LOOP;
END; $$;
CREATE FUNCTION public.parking_rejection_consensus() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF OLD.status='pending' AND NEW.status='rejected' THEN PERFORM public.refresh_parking_consensus(NEW.section_id); END IF; RETURN NEW;
END; $$;
CREATE TRIGGER parking_consensus_recovery AFTER UPDATE OF status ON public.pilot_submission FOR EACH ROW EXECUTE FUNCTION public.parking_rejection_consensus();
CREATE FUNCTION public.withdraw_parking_submission(submission uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE item public.pilot_submission; BEGIN
 IF NOT public.can_write_pilot_draft() THEN RAISE EXCEPTION 'Eligible sign-in required' USING ERRCODE='42501';END IF;
 SELECT * INTO item FROM public.pilot_submission WHERE id=submission AND owner_id=auth.uid();
 IF item.id IS NULL THEN RAISE EXCEPTION 'Own submission required' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(item.section_id::text,0));
 SELECT * INTO item FROM public.pilot_submission WHERE id=submission FOR UPDATE;
 IF item.status='rejected' THEN RETURN; END IF;
 IF item.status<>'pending' THEN RAISE EXCEPTION 'Only pending contributions can be withdrawn';END IF;
 UPDATE public.pilot_submission SET status='rejected' WHERE id=submission;
 INSERT INTO public.pilot_review_event(submission_id,actor_id,decision,reason) VALUES(submission,auth.uid(),'reject','Withdrawn by contributor');
END; $$;
REVOKE ALL ON FUNCTION public.refresh_parking_consensus(uuid),public.parking_rejection_consensus(),public.withdraw_parking_submission(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_parking_submission(uuid) TO authenticated;
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
  IF submission IS NOT NULL THEN IF EXISTS(SELECT 1 FROM public.pilot_submission WHERE id=submission AND status='rejected') THEN RAISE EXCEPTION 'This interpretation was rejected or withdrawn; correct the draft before resubmitting';END IF;RETURN submission;END IF;
 END IF;
 INSERT INTO public.pilot_submission(section_id,owner_id,payload,content_hash,base_revision) VALUES(s,auth.uid(),p,h,current_revision) ON CONFLICT ON CONSTRAINT pilot_submission_revision_identity DO NOTHING RETURNING id INTO submission;
 IF submission IS NULL THEN SELECT id INTO submission FROM public.pilot_submission WHERE section_id=s AND owner_id=auth.uid() AND content_hash=h AND base_revision IS NOT DISTINCT FROM current_revision;IF EXISTS(SELECT 1 FROM public.pilot_submission WHERE id=submission AND status='rejected') THEN RAISE EXCEPTION 'This interpretation was rejected or withdrawn; correct the draft before resubmitting';END IF;RETURN submission;END IF;
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
