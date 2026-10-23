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

UPDATE public.profile SET role='reviewer' WHERE id='00000000-0000-0000-0000-000000000101';
DO $$ DECLARE p jsonb;s uuid;BEGIN
 SELECT t.p INTO p FROM test_payload t;
 PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000102',true);
 BEGIN PERFORM public.submit_and_approve_parking(p);RAISE EXCEPTION 'User published directly';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000101',true);
 s:=public.submit_and_approve_parking(p);
 IF NOT EXISTS(SELECT 1 FROM public.pilot_submission WHERE id=s AND status='approved') THEN RAISE EXCEPTION 'Direct publication failed';END IF;
 IF public.submit_and_approve_parking(p)<>s THEN RAISE EXCEPTION 'Direct retry created duplicate';END IF;
 BEGIN PERFORM public.list_managed_users();RAISE EXCEPTION 'Reviewer listed users';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN PERFORM public.manage_profile_permissions('00000000-0000-0000-0000-000000000102','admin','eligible');RAISE EXCEPTION 'Reviewer edited permissions';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 PERFORM public.save_profile_settings('My name','hawthorn');
 IF (SELECT favourite_town FROM public.profile WHERE id=auth.uid())<>'hawthorn' THEN RAISE EXCEPTION 'Favourite town not saved'; END IF;
 PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000100',true);
 PERFORM public.manage_profile_permissions('00000000-0000-0000-0000-000000000102','reviewer','eligible');
 IF (SELECT role FROM public.profile WHERE id='00000000-0000-0000-0000-000000000102')<>'reviewer' THEN RAISE EXCEPTION 'Admin permission edit failed';END IF;
BEGIN PERFORM public.manage_profile_permissions(auth.uid(),'user','eligible');RAISE EXCEPTION 'Self demotion accepted';EXCEPTION WHEN raise_exception THEN IF SQLERRM='Self demotion accepted' THEN RAISE; END IF;END;
 BEGIN PERFORM public.manage_profile_permissions('00000000-0000-0000-0000-000000000106','reviewer','eligible');RAISE EXCEPTION 'Unconfirmed privilege grant accepted';EXCEPTION WHEN raise_exception THEN IF SQLERRM='Unconfirmed privilege grant accepted' THEN RAISE; END IF;END;
END; $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000101',true);
DO $$ BEGIN
 IF (SELECT count(*) FROM public.profile)<>1 THEN RAISE EXCEPTION 'Reviewer saw other profiles';END IF;
 IF has_function_privilege('anon','public.submit_and_approve_parking(jsonb)','EXECUTE') THEN RAISE EXCEPTION 'Anonymous direct approval available'; END IF;
END; $$;
RESET ROLE;
ROLLBACK;
