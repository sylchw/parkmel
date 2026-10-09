BEGIN;
CREATE TABLE public.pilot_street_side(id uuid PRIMARY KEY, geometry_version integer NOT NULL CHECK(geometry_version=1), street_name text NOT NULL, side text NOT NULL CHECK(side IN('left','right')), start_description text NOT NULL,end_description text NOT NULL,direction text NOT NULL,geom public.geometry(LineString,4326) NOT NULL);
CREATE TABLE public.pilot_submission(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),section_id uuid NOT NULL REFERENCES public.pilot_street_side(id),owner_id uuid NOT NULL REFERENCES public.profile(id),payload jsonb NOT NULL,content_hash text NOT NULL,base_revision uuid,submitted_at timestamptz NOT NULL DEFAULT now(),status text NOT NULL DEFAULT 'pending' CHECK(status IN('pending','approved','rejected')),UNIQUE(section_id,owner_id,content_hash));
CREATE TABLE public.pilot_publication(section_id uuid PRIMARY KEY REFERENCES public.pilot_street_side(id),submission_id uuid NOT NULL REFERENCES public.pilot_submission(id),verification text NOT NULL CHECK(verification IN('admin_verified','community_verified')),verified_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.pilot_review_event(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),submission_id uuid NOT NULL REFERENCES public.pilot_submission(id),actor_id uuid REFERENCES public.profile(id),decision text NOT NULL,reason text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.pilot_street_side ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_submission ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_publication ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_review_event ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pilot_street_side,public.pilot_submission,public.pilot_publication,public.pilot_review_event FROM anon,authenticated;
GRANT SELECT ON public.pilot_street_side,public.pilot_submission,public.pilot_publication,public.pilot_review_event TO authenticated;
CREATE POLICY pilot_geometry_read ON public.pilot_street_side FOR SELECT TO authenticated USING(public.can_write_pilot_draft());
CREATE POLICY pilot_submission_read ON public.pilot_submission FOR SELECT TO authenticated USING(public.can_write_pilot_draft() AND(owner_id=auth.uid() OR public.is_profile_admin()));
CREATE POLICY pilot_publication_read ON public.pilot_publication FOR SELECT TO authenticated USING(public.can_write_pilot_draft());
CREATE POLICY pilot_review_read ON public.pilot_review_event FOR SELECT TO authenticated USING(public.is_profile_admin());
CREATE TRIGGER pilot_review_immutable BEFORE UPDATE OR DELETE ON public.pilot_review_event FOR EACH ROW EXECUTE FUNCTION public.reject_evidence_mutation();
CREATE FUNCTION public.validate_pilot_payload(p jsonb,s uuid) RETURNS boolean LANGUAGE plpgsql SET search_path='' AS $$
DECLARE r jsonb;t jsonb;ids text[];mapped text[];
BEGIN
 IF (octet_length(p::text)<=65536 AND p @> jsonb_build_object('schemaVersion',1,'sectionId',s::text,'geometryVersion',1,'allPanelsAndBoundariesChecked',true)
 AND p->>'side' IN('left','right') AND length(trim(p->>'startDescription'))>0 AND length(trim(p->>'endDescription'))>0
 AND jsonb_array_length(p->'panels') BETWEEN 1 AND 20
 AND p->'schedule' @> jsonb_build_object('schemaVersion',1,'sectionId',s::text,'geometryVersion',1,'completeness','complete','coverage','full_schedule','verification','unverified','confidenceLevel',1,'lastVerifiedAt',null,'changeState','none')
 AND jsonb_array_length(p->'schedule'->'rules') BETWEEN 1 AND 100) IS NOT TRUE THEN RETURN false;END IF;
 FOR r IN SELECT value FROM jsonb_array_elements(p->'schedule'->'rules') LOOP
  IF (length(trim(r->>'id'))>0 AND r->>'type' IN('free','time_limit','fee','clearway','permit','loading','accessible','no_parking','no_stopping')
   AND r->>'feeStatus' IN('free','paid','unknown') AND r->>'permitCondition' IN('none','required') AND r->>'holidayPolicy' IN('applies','excluded')
   AND jsonb_array_length(r->'periods') BETWEEN 1 AND 100 AND r->'source'->>'type'='community'
   AND length(trim(r->'source'->>'identifier'))>0 AND r->'source'->>'evidenceKind' IN('field','street_view')
   AND r->'source'->>'observedAt' ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$'
   AND r->'source'->>'submittedAt' ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$'
   AND (r->'source'->>'observedAt')::timestamptz<=now()
   AND (r->'source'->>'submittedAt')::timestamptz BETWEEN (r->'source'->>'observedAt')::timestamptz AND now()+interval '5 minutes') IS NOT TRUE THEN RETURN false; END IF;
  IF r->>'type'='time_limit' AND ((r->>'maxDurationMinutes')::numeric>=1 AND (r->>'maxDurationMinutes')::numeric=trunc((r->>'maxDurationMinutes')::numeric)) IS NOT TRUE THEN RETURN false;END IF;
  IF r ? 'maxDurationMinutes' AND ((r->>'maxDurationMinutes')::numeric BETWEEN 1 AND 9007199254740991 AND (r->>'maxDurationMinutes')::numeric=trunc((r->>'maxDurationMinutes')::numeric)) IS NOT TRUE THEN RETURN false; END IF;
  IF r ? 'feeCents' AND ((r->>'feeCents')::numeric BETWEEN 0 AND 9007199254740991 AND (r->>'feeCents')::numeric=trunc((r->>'feeCents')::numeric)) IS NOT TRUE THEN RETURN false; END IF;
  IF r->>'type'='free' AND r->>'feeStatus'<>'free' OR r->>'type'='fee' AND r->>'feeStatus'<>'paid' OR r->>'type'='permit' AND r->>'permitCondition'<>'required' OR r->>'feeStatus'='free' AND r ? 'feeCents' AND r->>'feeCents'<>'0' THEN RETURN false;END IF;
  IF (r->'source' ? 'sourceDate') IS NOT TRUE THEN RETURN false;END IF;
  IF r->'source'->>'sourceDate' IS NOT NULL AND (r->'source'->>'sourceDate' ~ '^\d{4}-\d{2}-\d{2}$' AND (r->'source'->>'sourceDate')::date<=((r->'source'->>'observedAt')::timestamptz AT TIME ZONE 'UTC')::date) IS NOT TRUE THEN RETURN false;END IF;
  IF r->'source'->>'evidenceKind'='street_view' AND r->'source'->>'sourceDate' IS NULL THEN RETURN false;END IF;
  IF r ? 'extent' AND (r->>'type' IN('clearway','permit','loading','accessible','no_parking','no_stopping') AND jsonb_typeof(r->'extent'->'start')='number' AND jsonb_typeof(r->'extent'->'end')='number' AND (r->'extent'->>'start')::numeric>=0 AND (r->'extent'->>'end')::numeric<=1 AND (r->'extent'->>'end')::numeric>(r->'extent'->>'start')::numeric) IS NOT TRUE THEN RETURN false;END IF;
  FOR t IN SELECT value FROM jsonb_array_elements(r->'periods') LOOP
   IF (jsonb_typeof(t->'dayOfWeek')='number' AND jsonb_typeof(t->'startTime')='number' AND jsonb_typeof(t->'endTime')='number'
    AND (t->>'dayOfWeek')::numeric BETWEEN 0 AND 6 AND (t->>'dayOfWeek')::numeric=trunc((t->>'dayOfWeek')::numeric)
    AND (t->>'startTime')::numeric BETWEEN 0 AND 1439 AND (t->>'startTime')::numeric=trunc((t->>'startTime')::numeric)
    AND (t->>'endTime')::numeric BETWEEN 1 AND 1440 AND (t->>'endTime')::numeric=trunc((t->>'endTime')::numeric)
    AND (t->>'endTime')::numeric>(t->>'startTime')::numeric) IS NOT TRUE THEN RETURN false;END IF;
  END LOOP;
 END LOOP;
 SELECT array_agg(value->>'id' ORDER BY value->>'id') INTO ids FROM jsonb_array_elements(p->'schedule'->'rules');
 SELECT array_agg(DISTINCT x ORDER BY x) INTO mapped FROM jsonb_array_elements(p->'panels') a CROSS JOIN LATERAL jsonb_array_elements_text(a->'ruleIds') x;
 IF ids IS DISTINCT FROM mapped THEN RETURN false;END IF;
 FOR t IN SELECT value FROM jsonb_array_elements(p->'panels') LOOP
  IF (length(trim(t->>'id'))>0 AND length(trim(t->>'text'))>0 AND t->>'arrow' IN('left','right','both','none') AND jsonb_array_length(t->'ruleIds')>0) IS NOT TRUE THEN RETURN false;END IF;
 END LOOP;
 RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END;$$;
CREATE FUNCTION public.pilot_semantic_content(p jsonb) RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT COALESCE(jsonb_agg(rule ORDER BY rule::text),'[]'::jsonb) FROM (
 SELECT DISTINCT jsonb_build_object('type',value->'type','feeStatus',value->'feeStatus','feeCents',CASE WHEN value->>'feeStatus'='free' THEN '0'::jsonb ELSE COALESCE(value->'feeCents','null'::jsonb) END,'maxDurationMinutes',COALESCE(value->'maxDurationMinutes','null'::jsonb),'permitCondition',value->'permitCondition','holidayPolicy',value->'holidayPolicy','extent',COALESCE(value->'extent','null'::jsonb),'periods',(SELECT jsonb_agg(period ORDER BY period::text) FROM (SELECT DISTINCT jsonb_build_array(v->'dayOfWeek',v->'startTime',v->'endTime') AS period FROM jsonb_array_elements(value->'periods') v) periods)) AS rule FROM jsonb_array_elements(p->'schedule'->'rules')
 ) rules;
$$;
CREATE FUNCTION public.pilot_semantic_hash(p jsonb) RETURNS text LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT encode(sha256(convert_to(public.pilot_semantic_content(p)::text,'UTF8')),'hex');
$$;
CREATE FUNCTION public.protect_pilot_submission() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Submission history is immutable';END IF;
 IF (to_jsonb(NEW)-'status') IS DISTINCT FROM (to_jsonb(OLD)-'status') THEN RAISE EXCEPTION 'Submission evidence is immutable';END IF;
 RETURN NEW;
END;$$;
CREATE TRIGGER pilot_submission_immutable BEFORE UPDATE OR DELETE ON public.pilot_submission FOR EACH ROW EXECUTE FUNCTION public.protect_pilot_submission();
CREATE TRIGGER pilot_geometry_immutable BEFORE UPDATE OR DELETE ON public.pilot_street_side FOR EACH ROW EXECUTE FUNCTION public.reject_evidence_mutation();
CREATE FUNCTION public.submit_pilot_annotation(p jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s uuid;h text;submission uuid;current_revision uuid;agree integer;
BEGIN
 IF NOT public.can_write_pilot_draft() THEN RAISE EXCEPTION 'Confirmed eligible account required' USING ERRCODE='42501'; END IF;
 s:=(p->>'sectionId')::uuid;
 IF NOT public.validate_pilot_payload(p,s) OR NOT EXISTS(SELECT 1 FROM public.pilot_street_side WHERE id=s AND side=p->>'side' AND start_description=p->>'startDescription' AND end_description=p->>'endDescription') THEN RAISE EXCEPTION 'Invalid complete annotation or geometry'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(s::text,0));
 SELECT submission_id INTO current_revision FROM public.pilot_publication WHERE section_id=s;
 h:=public.pilot_semantic_hash(p);
 INSERT INTO public.pilot_submission(section_id,owner_id,payload,content_hash,base_revision) VALUES(s,auth.uid(),p,h,current_revision) ON CONFLICT(section_id,owner_id,content_hash) DO NOTHING RETURNING id INTO submission;
 IF submission IS NULL THEN SELECT id INTO submission FROM public.pilot_submission WHERE section_id=s AND owner_id=auth.uid() AND content_hash=h;RETURN submission;END IF;
 -- Count distinct confirmed eligible identities; conflicting pending positions do not vote.
 SELECT count(DISTINCT a.owner_id) INTO agree FROM public.pilot_submission a JOIN public.profile pr ON pr.id=a.owner_id JOIN auth.users u ON u.id=pr.id WHERE a.section_id=s AND a.content_hash=h AND public.pilot_semantic_content(a.payload)=public.pilot_semantic_content(p) AND a.status='pending' AND a.base_revision IS NOT DISTINCT FROM current_revision AND pr.eligibility='eligible' AND u.email_confirmed_at IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.pilot_submission b WHERE b.section_id=s AND b.owner_id=a.owner_id AND b.status='pending' AND b.base_revision IS NOT DISTINCT FROM current_revision AND b.content_hash<>h);
 IF agree>=5 AND current_revision IS NULL THEN
  INSERT INTO public.pilot_publication VALUES(s,submission,'community_verified',now());
  UPDATE public.pilot_submission SET status='approved' WHERE section_id=s AND content_hash=h AND status='pending';
  INSERT INTO public.pilot_review_event(submission_id,decision,reason) VALUES(submission,'community_verified','Five distinct eligible accounts agreed');
 END IF;
 RETURN submission;
END;$$;
CREATE FUNCTION public.review_pilot_annotation(submission uuid,decision text,reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item public.pilot_submission;current_revision uuid;
BEGIN
 IF NOT public.can_write_pilot_draft() OR NOT public.is_profile_admin() THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501';END IF;
 IF (decision IN('approve','reject') AND length(trim(reason)) BETWEEN 5 AND 2000) IS NOT TRUE THEN RAISE EXCEPTION 'Decision and review reason required';END IF;
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
 INSERT INTO public.pilot_review_event(submission_id,actor_id,decision,reason) VALUES(item.id,auth.uid(),decision,trim(reason));
END;$$;
CREATE FUNCTION public.pilot_section_schedules(west double precision,south double precision,east double precision,north double precision) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path='' AS $$
BEGIN
 IF NOT public.can_write_pilot_draft() THEN RAISE EXCEPTION 'Eligible account required' USING ERRCODE='42501';END IF;
 IF (west<east AND south<north AND west>=145.03 AND east<=145.10 AND south>=-37.91 AND north<=-37.86) IS NOT TRUE OR public.ST_Area(public.ST_MakeEnvelope(west,south,east,north,4326)::public.geography)>2000000 THEN RAISE EXCEPTION 'Invalid bounds';END IF;
 RETURN (WITH candidates AS (
 SELECT jsonb_build_object('sectionId',s.id,'geometryVersion',1,'streetName',s.street_name,'side',s.side,'startDescription',s.start_description,'endDescription',s.end_description,'geometry',public.ST_AsGeoJSON(s.geom)::jsonb,'schedule',a.payload->'schedule'||jsonb_build_object('verification',p.verification,'confidenceLevel',3,'lastVerifiedAt',to_char(p.verified_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'changeState','none')) AS row
 FROM public.pilot_street_side s JOIN public.pilot_publication p ON p.section_id=s.id JOIN public.pilot_submission a ON a.id=p.submission_id
 WHERE public.ST_Intersects(s.geom,public.ST_MakeEnvelope(west,south,east,north,4326)) ORDER BY s.id LIMIT 1001
 ), numbered AS (SELECT row,row_number() OVER() AS n FROM candidates)
 SELECT jsonb_build_object('sections',COALESCE(jsonb_agg(row) FILTER(WHERE n<=1000),'[]'::jsonb),'truncated',count(*)>1000) FROM numbered);
END;$$;
REVOKE ALL ON FUNCTION public.protect_pilot_submission(),public.pilot_semantic_content(jsonb),public.validate_pilot_payload(jsonb,uuid),public.pilot_semantic_hash(jsonb),public.submit_pilot_annotation(jsonb),public.review_pilot_annotation(uuid,text,text),public.pilot_section_schedules(double precision,double precision,double precision,double precision) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_pilot_annotation(jsonb),public.review_pilot_annotation(uuid,text,text),public.pilot_section_schedules(double precision,double precision,double precision,double precision) TO authenticated;
COMMIT;
