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

DO $$ DECLARE p jsonb;a uuid;b uuid;old_revision uuid;new_revision uuid;copy_a uuid;copy_b uuid;different uuid;before_count integer;i integer;BEGIN
 SELECT t.p INTO p FROM test_payload t;
 IF public.pilot_semantic_content(p) IS DISTINCT FROM public.pilot_semantic_content(jsonb_set(jsonb_set(p,'{schedule,rules,0,id}','"different-rule-id"'),'{schedule,rules,0,source,identifier}','"different-observer"')) THEN RAISE EXCEPTION 'Contributor identities or rule IDs changed matching settings';END IF;
 IF public.pilot_semantic_content(p)=public.pilot_semantic_content(jsonb_set(p,'{schedule,rules,0,holidayPolicy}','"excluded"')) THEN RAISE EXCEPTION 'Different holiday settings matched';END IF;
 PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000101',true);
 a:=public.submit_pilot_annotation(p);
 UPDATE auth.users SET email_confirmed_at=now() WHERE id='00000000-0000-0000-0000-000000000106';
 UPDATE public.profile SET eligibility='eligible' WHERE id='00000000-0000-0000-0000-000000000106';
 PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000106',true);PERFORM public.submit_pilot_annotation(p);
 UPDATE auth.users SET email_confirmed_at=NULL WHERE id='00000000-0000-0000-0000-000000000106';
 PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000101',true);
 BEGIN PERFORM public.review_pilot_annotation_current(a,'approve','',NULL);RAISE EXCEPTION 'Ordinary contributor approved';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 IF public.submit_pilot_annotation(p)<>a THEN RAISE EXCEPTION 'Retry did not reuse submission';END IF;
 PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000102',true);
 b:=public.submit_pilot_annotation(jsonb_set(p,'{schedule,rules,0,maxDurationMinutes}','60'));
 FOR i IN 103..105 LOOP
  PERFORM set_config('request.jwt.claim.sub',('00000000-0000-0000-0000-'||lpad(i::text,12,'0')),true);PERFORM public.submit_pilot_annotation(p);
 END LOOP;
 IF EXISTS(SELECT 1 FROM public.pilot_publication WHERE section_id=(p->>'sectionId')::uuid) THEN RAISE EXCEPTION 'Different details or four identities counted as five';END IF;
 PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000106',true);
 BEGIN PERFORM public.submit_pilot_annotation(p);RAISE EXCEPTION 'Unconfirmed vote accepted';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000107',true);PERFORM public.submit_pilot_annotation(p);
 SELECT submission_id INTO old_revision FROM public.pilot_publication WHERE section_id=(p->>'sectionId')::uuid;
 IF old_revision IS NULL OR (SELECT count(*) FROM public.pilot_submission WHERE status='approved')<>5 THEN RAISE EXCEPTION 'Five matching accounts failed initial publication';END IF;
 IF EXISTS(SELECT 1 FROM public.pilot_submission WHERE owner_id='00000000-0000-0000-0000-000000000106' AND status='approved') THEN RAISE EXCEPTION 'Unconfirmed pending account voted or received approval';END IF;
 -- A stale different submission requires the admin to compare the current revision.
 PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000100',true);
 BEGIN PERFORM public.review_pilot_annotation(b,'approve','');RAISE EXCEPTION 'Stale correction silently replaced current rules';EXCEPTION WHEN serialization_failure THEN NULL;END;
 PERFORM public.review_pilot_annotation_current(b,'approve','',old_revision);
 SELECT submission_id INTO old_revision FROM public.pilot_publication WHERE section_id=(p->>'sectionId')::uuid;
 IF old_revision<>b THEN RAISE EXCEPTION 'Reviewed correction did not replace publication';END IF;
 -- The same accounts can submit their earlier interpretation against a new revision.
 FOREACH i IN ARRAY ARRAY[101,103,104,105,107] LOOP
  PERFORM set_config('request.jwt.claim.sub',('00000000-0000-0000-0000-'||lpad(i::text,12,'0')),true);PERFORM public.submit_pilot_annotation(p);
 END LOOP;
 SELECT submission_id INTO new_revision FROM public.pilot_publication WHERE section_id=(p->>'sectionId')::uuid;
 IF new_revision=old_revision OR (SELECT verification FROM public.pilot_publication WHERE section_id=(p->>'sectionId')::uuid)<>'community_verified' THEN RAISE EXCEPTION 'Five matches did not update existing publication';END IF;
 -- Copies created together remain reviewable after the first one replaces the publication.
 PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000108',true);copy_a:=public.submit_pilot_annotation(jsonb_set(p,'{schedule,rules,0,maxDurationMinutes}','60'));
 PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000109',true);copy_b:=public.submit_pilot_annotation(jsonb_set(p,'{schedule,rules,0,maxDurationMinutes}','60'));
 PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000110',true);different:=public.submit_pilot_annotation(jsonb_set(p,'{schedule,rules,0,maxDurationMinutes}','180'));
 PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000100',true);
 PERFORM public.review_pilot_annotation_current(copy_a,'approve','',new_revision);
 SELECT count(*) INTO before_count FROM public.pilot_review_event;
 PERFORM public.review_pilot_annotation_current(copy_a,'approve','',new_revision);
 IF (SELECT count(*) FROM public.pilot_review_event)<>before_count THEN RAISE EXCEPTION 'Repeated approval duplicated audit or reward';END IF;
 PERFORM public.review_pilot_annotation_current(copy_b,'approve','',new_revision);
 IF (SELECT status FROM public.pilot_submission WHERE id=copy_b)<>'approved' OR (SELECT submission_id FROM public.pilot_publication WHERE section_id=(p->>'sectionId')::uuid)<>copy_a THEN RAISE EXCEPTION 'Identical stale copy bounced or replaced stable revision';END IF;
 BEGIN PERFORM public.review_pilot_annotation_current(different,'approve','',new_revision);RAISE EXCEPTION 'Outdated admin comparison overwrote newer publication';EXCEPTION WHEN serialization_failure THEN NULL;END;
 PERFORM public.review_pilot_annotation_current(different,'approve','',copy_a);
 IF (SELECT submission_id FROM public.pilot_publication WHERE section_id=(p->>'sectionId')::uuid)<>different THEN RAISE EXCEPTION 'Admin compared correction did not publish';END IF;
 -- Conflicting positions from one owner provide zero votes, not two votes.
 PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000101',true);PERFORM public.submit_pilot_annotation(p);PERFORM public.submit_pilot_annotation(jsonb_set(p,'{schedule,rules,0,maxDurationMinutes}','240'));
 FOREACH i IN ARRAY ARRAY[103,104,105,107] LOOP
  PERFORM set_config('request.jwt.claim.sub',('00000000-0000-0000-0000-'||lpad(i::text,12,'0')),true);PERFORM public.submit_pilot_annotation(p);
 END LOOP;
 IF (SELECT submission_id FROM public.pilot_publication WHERE section_id=(p->>'sectionId')::uuid)<>different THEN RAISE EXCEPTION 'Conflicting account counted toward consensus';END IF;
 PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000108',true);PERFORM public.submit_pilot_annotation(p);
 IF (SELECT submission_id FROM public.pilot_publication WHERE section_id=(p->>'sectionId')::uuid)=different THEN RAISE EXCEPTION 'Five eligible non-conflicting accounts failed';END IF;
 IF EXISTS(SELECT 1 FROM public.pilot_submission WHERE owner_id='00000000-0000-0000-0000-000000000101' AND base_revision=different AND status='approved') THEN RAISE EXCEPTION 'Conflicting owner received approval';END IF;
END;$$;
RESET ROLE;
ROLLBACK;
