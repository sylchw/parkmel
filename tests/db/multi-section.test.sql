BEGIN;
INSERT INTO auth.users(id,email_confirmed_at) SELECT ('00000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,CASE WHEN i=106 THEN NULL ELSE now() END FROM generate_series(100,110) i;
UPDATE public.profile SET role='admin' WHERE id='00000000-0000-0000-0000-000000000100';
DO $$ BEGIN
 IF to_regclass('public.pilot_street_segment') IS NOT NULL THEN
  INSERT INTO public.pilot_street_segment(id,geom) VALUES('00000000-0000-0000-0000-000000000201',public.ST_GeomFromText('LINESTRING(145.055 -37.886,145.057 -37.886)',4326));
  INSERT INTO public.pilot_street_side(id,geometry_version,street_name,side,start_description,end_description,direction,segment_id) VALUES('00000000-0000-0000-0000-000000000200',1,'Test road','left','Junction A','Junction B','towards B','00000000-0000-0000-0000-000000000201');
 ELSE
  INSERT INTO public.pilot_street_side(id,geometry_version,street_name,side,start_description,end_description,direction,geom) VALUES('00000000-0000-0000-0000-000000000200',1,'Test road','left','Junction A','Junction B','towards B',public.ST_GeomFromText('LINESTRING(145.055 -37.886,145.057 -37.886)',4326));
 END IF;
END;$$;
CREATE TEMP TABLE test_payload AS SELECT jsonb_build_object('schemaVersion',1,'sectionId','00000000-0000-0000-0000-000000000200','geometryVersion',1,'side','left','startDescription','Junction A','endDescription','Junction B','allPanelsAndBoundariesChecked',true,'panels',jsonb_build_array(jsonb_build_object('id','panel','text','2P','arrow','both','ruleIds',jsonb_build_array('rule'))),'schedule',jsonb_build_object('schemaVersion',1,'sectionId','00000000-0000-0000-0000-000000000200','geometryVersion',1,'completeness','complete','coverage','full_schedule','verification','unverified','confidenceLevel',1,'lastVerifiedAt',null,'changeState','none','rules',jsonb_build_array(jsonb_build_object('id','rule','type','time_limit','maxDurationMinutes',120,'feeStatus','free','permitCondition','none','holidayPolicy','applies','periods',jsonb_build_array(jsonb_build_object('dayOfWeek',4,'startTime',0,'endTime',1440)),'source',jsonb_build_object('type','community','identifier','sign','evidenceKind','field','observedAt',to_char(now()-interval '1 hour','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'submittedAt',to_char(now(),'YYYY-MM-DD"T"HH24:MI:SS"Z"'),'sourceDate',null))))) AS p;
GRANT SELECT ON test_payload TO authenticated;


INSERT INTO public.pilot_street_side SELECT (jsonb_populate_record(NULL::public.pilot_street_side,to_jsonb(s)||'{"id":"00000000-0000-0000-0000-000000000202","side":"right"}'::jsonb)).* FROM public.pilot_street_side s WHERE id='00000000-0000-0000-0000-000000000200';
INSERT INTO public.pilot_street_side SELECT (jsonb_populate_record(NULL::public.pilot_street_side,to_jsonb(s)||'{"id":"00000000-0000-0000-0000-000000000203","street_name":"Different road"}'::jsonb)).* FROM public.pilot_street_side s WHERE id='00000000-0000-0000-0000-000000000200';
-- Valid same-street targets isolate the size-limit check from mixed/unknown-ID rejection.
INSERT INTO public.pilot_street_side SELECT (jsonb_populate_record(NULL::public.pilot_street_side,to_jsonb(s)||jsonb_build_object('id',('00000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid))).* FROM public.pilot_street_side s CROSS JOIN generate_series(1000,1098) n WHERE s.id='00000000-0000-0000-0000-000000000200';
DO $$ BEGIN
 IF has_function_privilege('anon','public.submit_street_annotations(jsonb,uuid[],boolean)','EXECUTE') THEN RAISE EXCEPTION 'Anonymous batch access';END IF;
END;$$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000102',true);
DO $$ DECLARE p jsonb;first_result jsonb;again jsonb;bad uuid[];BEGIN
 SELECT t.p||'{"replicationConfirmed":true}'::jsonb INTO p FROM test_payload t;
 first_result:=public.submit_street_annotations(p,ARRAY['00000000-0000-0000-0000-000000000202','00000000-0000-0000-0000-000000000200']::uuid[],false);
 again:=public.submit_street_annotations(p,ARRAY['00000000-0000-0000-0000-000000000200','00000000-0000-0000-0000-000000000202']::uuid[],false);
 IF first_result<>again OR (first_result->>'count')::int<>2 OR (SELECT count(*) FROM public.pilot_submission WHERE owner_id=auth.uid())<>2 THEN RAISE EXCEPTION 'Batch retry duplicated contributions';END IF;
 IF EXISTS(SELECT 1 FROM public.pilot_submission a JOIN public.pilot_street_side s ON s.id=a.section_id WHERE a.owner_id=auth.uid() AND (a.payload->>'side'<>s.side OR a.payload->>'startDescription'<>s.start_description OR a.payload->'schedule'->>'sectionId'<>s.id::text)) THEN RAISE EXCEPTION 'Cloned section identity incorrect';END IF;
 FOREACH bad SLICE 1 IN ARRAY ARRAY[ARRAY['00000000-0000-0000-0000-000000000200','00000000-0000-0000-0000-000000000200']::uuid[],ARRAY['00000000-0000-0000-0000-000000000200','00000000-0000-0000-0000-000000009999']::uuid[]] LOOP
  BEGIN PERFORM public.submit_street_annotations(p,bad,false);RAISE EXCEPTION 'Bad section array accepted';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 END LOOP;
 SELECT array_agg(id) INTO bad FROM public.pilot_street_side WHERE street_name='Test road';
 IF cardinality(bad)<>101 THEN RAISE EXCEPTION 'Wrong cap test fixture';END IF;
 BEGIN PERFORM public.submit_street_annotations(p,bad,false);RAISE EXCEPTION 'Too many sections accepted';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 BEGIN PERFORM public.submit_street_annotations(p,ARRAY['00000000-0000-0000-0000-000000000200','00000000-0000-0000-0000-000000000203']::uuid[],false);RAISE EXCEPTION 'Mixed streets accepted';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 BEGIN PERFORM public.submit_street_annotations(p,ARRAY['00000000-0000-0000-0000-000000000200','00000000-0000-0000-0000-000000000202']::uuid[],true);RAISE EXCEPTION 'User directly approved batch';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN PERFORM public.submit_street_annotations(p-'replicationConfirmed',ARRAY['00000000-0000-0000-0000-000000000200','00000000-0000-0000-0000-000000000202']::uuid[],false);RAISE EXCEPTION 'Unconfirmed batch accepted';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 BEGIN PERFORM public.submit_street_annotations(jsonb_set(jsonb_set(p,'{schedule,rules,0,type}','"no_stopping"'),'{schedule,rules,0,extent}','{"start":0,"end":0.1}'),ARRAY['00000000-0000-0000-0000-000000000200','00000000-0000-0000-0000-000000000202']::uuid[],false);RAISE EXCEPTION 'Local zone copied';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
END;$$;
RESET ROLE;
-- Create a late failure: the last selected side already has this account's rejected interpretation.
DO $$ DECLARE p jsonb;s uuid;BEGIN
 SELECT t.p INTO p FROM test_payload t;
 PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000103',true);
 s:=public.submit_pilot_annotation(p||jsonb_build_object('sectionId','00000000-0000-0000-0000-000000000202','side','right','schedule',(p->'schedule')||'{"sectionId":"00000000-0000-0000-0000-000000000202"}'::jsonb));
 PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000100',true);
 PERFORM public.review_pilot_annotation_current(s,'reject','',NULL);
 PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000103',true);
 BEGIN PERFORM public.submit_street_annotations(p||'{"replicationConfirmed":true}'::jsonb,ARRAY['00000000-0000-0000-0000-000000000200','00000000-0000-0000-0000-000000000202']::uuid[],false);RAISE EXCEPTION 'Rejected retry accepted';EXCEPTION WHEN raise_exception THEN IF SQLERRM='Rejected retry accepted' THEN RAISE;END IF;END;
 IF EXISTS(SELECT 1 FROM public.pilot_submission WHERE owner_id=auth.uid() AND section_id='00000000-0000-0000-0000-000000000200') THEN RAISE EXCEPTION 'Partial batch committed';END IF;
END;$$;
-- One account selecting two sides is still only one vote per side. Four more accounts are needed.
DO $$ DECLARE p jsonb;actor int;before_count bigint;BEGIN
 SELECT t.p||'{"replicationConfirmed":true}'::jsonb INTO p FROM test_payload t;
 IF (SELECT count(*) FROM public.pilot_publication)<>0 THEN RAISE EXCEPTION 'One batch manufactured consensus';END IF;
 FOREACH actor IN ARRAY ARRAY[104,105,107,108] LOOP
  PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-'||lpad(actor::text,12,'0'),true);
  PERFORM public.submit_street_annotations(p,ARRAY['00000000-0000-0000-0000-000000000200','00000000-0000-0000-0000-000000000202']::uuid[],false);
 END LOOP;
 IF (SELECT count(*) FROM public.pilot_publication)<>2 THEN RAISE EXCEPTION 'Five-account batch consensus failed';END IF;
 SELECT count(*) INTO before_count FROM public.pilot_submission;
 PERFORM public.submit_street_annotations(p,ARRAY['00000000-0000-0000-0000-000000000202','00000000-0000-0000-0000-000000000200']::uuid[],false);
 IF (SELECT count(*) FROM public.pilot_submission)<>before_count THEN RAISE EXCEPTION 'Consensus retry duplicated rewards';END IF;
 PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000100',true);
 PERFORM public.submit_street_annotations(jsonb_set(p,'{schedule,rules,0,maxDurationMinutes}','60'),ARRAY['00000000-0000-0000-0000-000000000200','00000000-0000-0000-0000-000000000202']::uuid[],true);
 IF EXISTS(SELECT 1 FROM public.pilot_publication WHERE verification<>'admin_verified') THEN RAISE EXCEPTION 'Admin direct batch failed';END IF;
END;$$;
ROLLBACK;
