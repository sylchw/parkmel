BEGIN;
INSERT INTO auth.users(id,email_confirmed_at) VALUES('00000000-0000-0000-0000-000000000301',now());
CREATE TEMP TABLE preview_fixture AS SELECT s.id FROM public.pilot_street_side s JOIN public.pilot_side_geometry g ON g.id=s.id WHERE public.ST_Intersects(g.geom,public.ST_MakeEnvelope(145.05464649,-37.8899646,145.06364649,-37.8829646,4326)) LIMIT 1;
INSERT INTO public.pilot_submission(id,section_id,owner_id,payload,content_hash,status) SELECT '00000000-0000-0000-0000-000000000302',id,'00000000-0000-0000-0000-000000000301',jsonb_build_object('schedule',jsonb_build_object('completeness','complete','coverage','full_schedule','rules',jsonb_build_array(jsonb_build_object('id','private-rule','type','free','periods','[]'::jsonb,'source',jsonb_build_object('type','community','identifier','private-identifier','reference','private-evidence','evidenceKind','field','observedAt',now(),'submittedAt',now(),'sourceDate',null))))),'fixture','approved' FROM preview_fixture;
INSERT INTO public.pilot_publication(section_id,submission_id,verification) SELECT id,'00000000-0000-0000-0000-000000000302','admin_verified' FROM preview_fixture;
SET LOCAL ROLE anon;
DO $$ DECLARE data jsonb;BEGIN
 data=public.town_centre_preview('carnegie');
 IF jsonb_array_length(data->'sections')<>1 THEN RAISE EXCEPTION 'Approved preview missing';END IF;
 IF data::text LIKE '%private-%' OR data::text LIKE '%000000000301%' THEN RAISE EXCEPTION 'Private evidence leaked';END IF;
 IF jsonb_array_length(public.town_centre_preview('hampton')->'sections')<>0 THEN RAISE EXCEPTION 'Preview escaped its town';END IF;
 BEGIN PERFORM public.town_centre_preview('arbitrary');RAISE EXCEPTION 'Arbitrary location allowed';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 BEGIN PERFORM * FROM public.pilot_submission;RAISE EXCEPTION 'Raw table access allowed';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END;$$;
RESET ROLE;
ROLLBACK;
