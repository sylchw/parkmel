BEGIN;
CREATE TEMP TABLE test_payload AS SELECT jsonb_build_object('schemaVersion',1,'sectionId',side.id::text,'geometryVersion',1,'side',side.side,'startDescription',side.start_description,'endDescription',side.end_description,'allPanelsAndBoundariesChecked',true,'panels',jsonb_build_array(jsonb_build_object('id','panel','text','2P','arrow','both','ruleIds',jsonb_build_array('rule'))),'schedule',jsonb_build_object('schemaVersion',1,'sectionId',side.id::text,'geometryVersion',1,'completeness','complete','coverage','full_schedule','verification','unverified','confidenceLevel',1,'lastVerifiedAt',null,'changeState','none','rules',jsonb_build_array(jsonb_build_object('id','rule','type','towaway','maxDurationMinutes',120,'feeStatus','free','permitCondition','none','holidayPolicy','applies','periods',jsonb_build_array(jsonb_build_object('dayOfWeek',4,'startTime',0,'endTime',1440)),'source',jsonb_build_object('type','community','identifier','sign','evidenceKind','community_entry','observedAt',to_char(now()-interval '1 hour','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'submittedAt',to_char(now(),'YYYY-MM-DD"T"HH24:MI:SS"Z"'),'sourceDate',null))))) AS p,side.id AS side_id FROM public.pilot_street_side side LIMIT 1;
DO $$ DECLARE p jsonb;s uuid;BEGIN
 SELECT t.p,t.side_id INTO p,s FROM test_payload t;
 IF NOT public.validate_pilot_payload(p,s) THEN RAISE EXCEPTION 'Community entry tow-away rejected';END IF;
 IF public.validate_pilot_payload(jsonb_set(p,'{schedule,verification}','"admin_verified"'),s) THEN RAISE EXCEPTION 'Self-verification accepted';END IF;
 IF public.validate_pilot_payload(jsonb_set(p,'{schedule,rules,0,source,evidenceKind}','"unknown"'),s) THEN RAISE EXCEPTION 'Unknown evidence accepted';END IF;
 IF public.validate_pilot_payload(jsonb_set(p,'{schedule,rules,0,periods,0,dayOfWeek}','null'),s) THEN RAISE EXCEPTION 'Incomplete period accepted';END IF;
END;$$;
ROLLBACK;
