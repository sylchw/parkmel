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

DO $$ DECLARE p jsonb;original uuid;correction uuid;new_revision uuid;BEGIN
 SELECT t.p INTO p FROM test_payload t;
 PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000101',true);original:=public.submit_pilot_annotation(p);
 PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000100',true);PERFORM public.review_pilot_annotation_current(original,'approve','',NULL);
 PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000101',true);
 IF public.submit_pilot_annotation(p)<>original OR (SELECT count(*) FROM public.pilot_submission)<>1 THEN RAISE EXCEPTION 'Retry after publication created another contribution or reward';END IF;
 PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000102',true);correction:=public.submit_pilot_annotation(jsonb_set(p,'{schedule,rules,0,maxDurationMinutes}','60'));
 PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000100',true);PERFORM public.review_pilot_annotation_current(correction,'approve','',original);
 PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000101',true);new_revision:=public.submit_pilot_annotation(p);
 IF new_revision=original OR (SELECT base_revision FROM public.pilot_submission WHERE id=new_revision)<>correction THEN RAISE EXCEPTION 'Prior interpretation could not be submitted as a genuine correction';END IF;
END;$$;
-- Rerun every matching/replacement scenario using the final submission function.
ROLLBACK;
