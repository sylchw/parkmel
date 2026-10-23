BEGIN;
-- One transaction, with the existing per-section validation, consensus and review machinery.
CREATE FUNCTION public.submit_street_annotations(p jsonb,sections uuid[],direct_approve boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE anchor public.pilot_street_side;target public.pilot_street_side;ids uuid[];s uuid;payload jsonb;submission uuid;result jsonb:='[]'::jsonb;
BEGIN
 IF NOT public.can_write_pilot_draft() THEN RAISE EXCEPTION 'Confirmed eligible account required' USING ERRCODE='42501';END IF;
 IF direct_approve IS NULL OR direct_approve AND NOT public.can_review_parking() THEN RAISE EXCEPTION 'Reviewer required' USING ERRCODE='42501';END IF;
 SELECT array_agg(DISTINCT id ORDER BY id) INTO ids FROM unnest(sections) id;
 IF cardinality(sections) IS NULL OR cardinality(sections) NOT BETWEEN 1 AND 100 OR cardinality(ids) IS DISTINCT FROM cardinality(sections) OR array_position(sections,NULL) IS NOT NULL OR octet_length(p::text)>65536 THEN RAISE EXCEPTION 'Choose 1 to 100 distinct sections' USING ERRCODE='22023';END IF;
 SELECT * INTO anchor FROM public.pilot_street_side WHERE id=(p->>'sectionId')::uuid;
 IF anchor.id IS NULL OR NOT anchor.id=ANY(ids) OR NOT public.validate_pilot_payload(p,anchor.id) OR p->>'side' IS DISTINCT FROM anchor.side OR p->>'startDescription' IS DISTINCT FROM anchor.start_description OR p->>'endDescription' IS DISTINCT FROM anchor.end_description THEN RAISE EXCEPTION 'Invalid source section or complete rules' USING ERRCODE='22023';END IF;
 IF cardinality(ids)>1 THEN
  IF NOT p @> '{"replicationConfirmed":true}'::jsonb OR btrim(anchor.street_name)='' OR lower(btrim(anchor.street_name))='unnamed road' THEN RAISE EXCEPTION 'Confirm every named street side' USING ERRCODE='22023';END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p->'schedule'->'rules') r WHERE r ? 'extent' AND ((r->'extent'->>'start')::numeric<>0 OR (r->'extent'->>'end')::numeric<>1)) THEN RAISE EXCEPTION 'Local restrictions must be entered per section' USING ERRCODE='22023';END IF;
 END IF;
 IF (SELECT count(*) FROM public.pilot_street_side WHERE id=ANY(ids) AND lower(btrim(street_name))=lower(btrim(anchor.street_name)))<>cardinality(ids) THEN RAISE EXCEPTION 'Choose registered sections of the same named street' USING ERRCODE='22023';END IF;
 -- A stable lock order avoids opposite selection order deadlocking two batches.
 FOREACH s IN ARRAY ids LOOP PERFORM pg_advisory_xact_lock(hashtextextended(s::text,0));END LOOP;
 FOREACH s IN ARRAY ids LOOP
  SELECT * INTO target FROM public.pilot_street_side WHERE id=s;
  payload:=(p-'sectionIds'-'replicationConfirmed'-'directApprove')||jsonb_build_object('sectionId',s,'geometryVersion',target.geometry_version,'side',target.side,'startDescription',target.start_description,'endDescription',target.end_description,'schedule',(p->'schedule')||jsonb_build_object('sectionId',s,'geometryVersion',target.geometry_version));
  IF direct_approve THEN submission:=public.submit_and_approve_parking(payload);ELSE submission:=public.submit_pilot_annotation(payload);END IF;
  result:=result||jsonb_build_array(jsonb_build_object('sectionId',s,'id',submission));
 END LOOP;
 RETURN jsonb_build_object('submissions',result,'count',cardinality(ids));
END;$$;
REVOKE ALL ON FUNCTION public.submit_street_annotations(jsonb,uuid[],boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_street_annotations(jsonb,uuid[],boolean) TO authenticated;
COMMENT ON FUNCTION public.submit_street_annotations(jsonb,uuid[],boolean) IS 'Atomic same-street contributions, maximum 100 sides; independent per-side reviews, consensus, revisions and retry identities.';
NOTIFY pgrst,'reload schema';
COMMIT;
