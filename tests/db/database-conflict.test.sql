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

DO $$ DECLARE p jsonb;q jsonb;BEGIN
 SELECT t.p INTO p FROM test_payload t;
 q:=jsonb_set(p,'{schedule,rules}',(p->'schedule'->'rules')||jsonb_build_array(jsonb_set(jsonb_set(p->'schedule'->'rules'->0,'{type}','"no_stopping"'),'{id}','"stop"')));
 q:=jsonb_set(q,'{panels,0,ruleIds}','["rule","stop"]');
 IF public.validate_pilot_payload(q,(p->>'sectionId')::uuid) THEN RAISE EXCEPTION 'Database accepted conflicting permission'; END IF;
 q:=jsonb_set(q,'{schedule,rules,1,extent}','{"start":0.1,"end":0.2}');
 IF NOT public.validate_pilot_payload(q,(p->>'sectionId')::uuid) THEN RAISE EXCEPTION 'Small local prohibition incorrectly rejected';END IF;
 IF NOT public.validate_pilot_payload(p,(p->>'sectionId')::uuid) THEN RAISE EXCEPTION 'Ordinary parking rejected';END IF;
END; $$;
ROLLBACK;
