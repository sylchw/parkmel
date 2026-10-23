BEGIN;
SET LOCAL ROLE anon;
DO $$ DECLARE path text;verb text;BEGIN
 FOREACH path IN ARRAY ARRAY['/spatial_ref_sys','spatial_ref_sys','/spatial_ref_sys/','/%73patial_ref_sys','/spatial%5fref%5fsys','/SPATIAL_REF_SYS','/rest/v1/spatial_ref_sys','/rpc/st_transform','rpc/st_astext'] LOOP
 FOREACH verb IN ARRAY ARRAY['GET','HEAD','POST','PATCH','DELETE'] LOOP
 PERFORM set_config('request.path',path,true);PERFORM set_config('request.method',verb,true);
 BEGIN PERFORM public.parkmel_api_guard();RAISE EXCEPTION 'Reference endpoint was admitted';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 END LOOP;END LOOP;
 FOREACH path IN ARRAY ARRAY['/profile','/annotation_draft','/pilot_submission','/pilot_publication','/rpc/limited_account_sections','/rpc/submit_pilot_annotation','/rpc/town_centre_preview','/'] LOOP
 PERFORM set_config('request.path',path,true);PERFORM public.parkmel_api_guard();
 END LOOP;
END;$$;
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.path','/spatial_ref_sys',true);
DO $$ BEGIN BEGIN PERFORM public.parkmel_api_guard();RAISE EXCEPTION 'Authenticated bypass';EXCEPTION WHEN insufficient_privilege THEN NULL;END;END;$$;
RESET ROLE;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_db_role_setting s CROSS JOIN LATERAL unnest(s.setconfig) setting WHERE s.setrole=(SELECT oid FROM pg_roles WHERE rolname='authenticator') AND s.setdatabase=(SELECT oid FROM pg_database WHERE datname=current_database()) AND setting='pgrst.db_pre_request=public.parkmel_api_guard') THEN RAISE EXCEPTION 'Request guard not registered';END IF;
 IF (SELECT count(*) FROM public.spatial_ref_sys)=0 THEN RAISE EXCEPTION 'Reference data missing';END IF;
 PERFORM public.ST_Transform(public.ST_SetSRID(public.ST_Point(145.05,-37.88),4326),3857);
END;$$;
ROLLBACK;
