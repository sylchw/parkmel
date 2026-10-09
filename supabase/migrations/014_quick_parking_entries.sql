BEGIN;
-- Community interpretations remain unverified; authentication and approval rules are unchanged.
CREATE OR REPLACE FUNCTION public.validate_pilot_payload(p jsonb,s uuid) RETURNS boolean LANGUAGE plpgsql SET search_path='' AS $$
DECLARE r jsonb;t jsonb;ids text[];mapped text[];
BEGIN
 IF (octet_length(p::text)<=65536 AND p @> jsonb_build_object('schemaVersion',1,'sectionId',s::text,'geometryVersion',1,'allPanelsAndBoundariesChecked',true)
 AND p->>'side' IN('left','right') AND length(trim(p->>'startDescription'))>0 AND length(trim(p->>'endDescription'))>0
 AND jsonb_array_length(p->'panels') BETWEEN 1 AND 20
 AND p->'schedule' @> jsonb_build_object('schemaVersion',1,'sectionId',s::text,'geometryVersion',1,'completeness','complete','coverage','full_schedule','verification','unverified','confidenceLevel',1,'lastVerifiedAt',null,'changeState','none')
 AND jsonb_array_length(p->'schedule'->'rules') BETWEEN 1 AND 100) IS NOT TRUE THEN RETURN false;END IF;
 FOR r IN SELECT value FROM jsonb_array_elements(p->'schedule'->'rules') LOOP
  IF (length(trim(r->>'id'))>0 AND r->>'type' IN('free','time_limit','fee','clearway','permit','loading','accessible','no_parking','no_stopping','towaway')
   AND r->>'feeStatus' IN('free','paid','unknown') AND r->>'permitCondition' IN('none','required') AND r->>'holidayPolicy' IN('applies','excluded')
   AND jsonb_array_length(r->'periods') BETWEEN 1 AND 100 AND r->'source'->>'type'='community'
   AND length(trim(r->'source'->>'identifier'))>0 AND r->'source'->>'evidenceKind' IN('field','street_view','community_entry')
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
  IF r ? 'extent' AND (r->>'type' IN('clearway','permit','loading','accessible','no_parking','no_stopping','towaway') AND jsonb_typeof(r->'extent'->'start')='number' AND jsonb_typeof(r->'extent'->'end')='number' AND (r->'extent'->>'start')::numeric>=0 AND (r->'extent'->>'end')::numeric<=1 AND (r->'extent'->>'end')::numeric>(r->'extent'->>'start')::numeric) IS NOT TRUE THEN RETURN false;END IF;
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
COMMIT;
