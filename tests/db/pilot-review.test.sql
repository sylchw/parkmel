BEGIN;
INSERT INTO auth.users(id,email_confirmed_at) SELECT ('00000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,CASE WHEN i=106 THEN NULL ELSE now() END FROM generate_series(100,106) i;
UPDATE public.profile SET role='admin' WHERE id='00000000-0000-0000-0000-000000000100';
INSERT INTO public.pilot_street_side VALUES('00000000-0000-0000-0000-000000000200',1,'Test road','left','Junction A','Junction B','towards B',public.ST_GeomFromText('LINESTRING(145.055 -37.886,145.057 -37.886)',4326));
CREATE TEMP TABLE test_payload AS SELECT jsonb_build_object('schemaVersion',1,'sectionId','00000000-0000-0000-0000-000000000200','geometryVersion',1,'side','left','startDescription','Junction A','endDescription','Junction B','allPanelsAndBoundariesChecked',true,'panels',jsonb_build_array(jsonb_build_object('id','panel','text','2P','arrow','both','ruleIds',jsonb_build_array('rule'))),'schedule',jsonb_build_object('schemaVersion',1,'sectionId','00000000-0000-0000-0000-000000000200','geometryVersion',1,'completeness','complete','coverage','full_schedule','verification','unverified','confidenceLevel',1,'lastVerifiedAt',null,'changeState','none','rules',jsonb_build_array(jsonb_build_object('id','rule','type','time_limit','maxDurationMinutes',120,'feeStatus','free','permitCondition','none','holidayPolicy','applies','periods',jsonb_build_array(jsonb_build_object('dayOfWeek',4,'startTime',0,'endTime',1440)),'source',jsonb_build_object('type','community','identifier','sign','evidenceKind','field','observedAt',to_char(now()-interval '1 hour','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'submittedAt',to_char(now(),'YYYY-MM-DD"T"HH24:MI:SS"Z"'),'sourceDate',null))))) AS p;
GRANT SELECT ON test_payload TO authenticated;
DO $$ DECLARE p jsonb;k text;BEGIN
 SELECT t.p INTO p FROM test_payload t;
 IF NOT public.validate_pilot_payload(p,'00000000-0000-0000-0000-000000000200') THEN RAISE EXCEPTION 'Valid payload rejected';END IF;
 FOR k IN SELECT jsonb_object_keys(p) LOOP
 IF public.validate_pilot_payload(p-k,'00000000-0000-0000-0000-000000000200') THEN RAISE EXCEPTION 'Missing envelope field accepted: %',k;END IF;
 END LOOP;
 IF public.validate_pilot_payload(jsonb_set(p,'{schedule,rules,0,periods,0,dayOfWeek}','null'),'00000000-0000-0000-0000-000000000200') THEN RAISE EXCEPTION 'Null period accepted';END IF;
 IF public.validate_pilot_payload(jsonb_set(p,'{schedule,rules,0,maxDurationMinutes}','null'),'00000000-0000-0000-0000-000000000200') THEN RAISE EXCEPTION 'Null time limit accepted';END IF;
 IF public.validate_pilot_payload(jsonb_set(p,'{schedule,rules,0,extent}','{"start":null,"end":1}'),'00000000-0000-0000-0000-000000000200') THEN RAISE EXCEPTION 'Invalid extent accepted';END IF;
END;$$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000106',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN PERFORM public.submit_pilot_annotation(p) FROM test_payload;RAISE EXCEPTION 'Unconfirmed submission allowed';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END;$$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000101',true);
SET LOCAL ROLE authenticated;
SELECT public.submit_pilot_annotation(p) FROM test_payload;
SELECT public.submit_pilot_annotation(p) FROM test_payload;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.pilot_submission)<>1 THEN RAISE EXCEPTION 'Retry counted twice';END IF;
 BEGIN PERFORM public.review_pilot_annotation((SELECT id FROM public.pilot_submission LIMIT 1),'approve','Reviewed signs');RAISE EXCEPTION 'Ordinary user approved';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END;$$;
RESET ROLE;
DO $$ DECLARE i integer;BEGIN
 FOR i IN 102..105 LOOP
 PERFORM set_config('request.jwt.claim.sub',('00000000-0000-0000-0000-'||lpad(i::text,12,'0')),true);
 PERFORM public.submit_pilot_annotation(p) FROM test_payload;
 END LOOP;
 IF (SELECT verification FROM public.pilot_publication) IS DISTINCT FROM 'community_verified' THEN RAISE EXCEPTION 'Five matching identities did not publish';END IF;
 BEGIN UPDATE public.pilot_submission SET payload='{}';RAISE EXCEPTION 'Evidence mutation allowed';EXCEPTION WHEN raise_exception THEN IF SQLERRM='Evidence mutation allowed' THEN RAISE;END IF;END;
END;$$;
-- Changed interpretation waits for admin and cannot silently replace an approved revision.
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000101',true);
SELECT public.submit_pilot_annotation(jsonb_set(p,'{schedule,rules,0,maxDurationMinutes}','60')) FROM test_payload;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000100',true);
SET LOCAL ROLE authenticated;
SELECT public.review_pilot_annotation(id,'approve','Checked complete changed signs') FROM public.pilot_submission WHERE status='pending';
DO $$ BEGIN
 IF (SELECT verification FROM public.pilot_publication) IS DISTINCT FROM 'admin_verified' THEN RAISE EXCEPTION 'Admin approval not published';END IF;
 IF (SELECT count(*) FROM public.pilot_review_event)<>2 THEN RAISE EXCEPTION 'Audit missing';END IF;
 BEGIN PERFORM public.pilot_section_schedules(NULL,-37.887,145.058,-37.885);RAISE EXCEPTION 'Null bounds allowed';EXCEPTION WHEN raise_exception THEN IF SQLERRM='Null bounds allowed' THEN RAISE;END IF;END;
 IF jsonb_array_length(public.pilot_section_schedules(145.054,-37.887,145.058,-37.885)->'sections')<>1 THEN RAISE EXCEPTION 'Published map projection missing';END IF;
END;$$;
RESET ROLE;
ROLLBACK;
