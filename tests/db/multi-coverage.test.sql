DO $$ BEGIN
 IF (SELECT count(*) FROM public.pilot_coverage_area)<>14 THEN RAISE EXCEPTION 'Missing suburb';END IF;
 IF has_function_privilege('authenticated','public.register_pilot_geometry_batch(jsonb)','EXECUTE') OR has_function_privilege('anon','public.register_pilot_geometry_batch(jsonb)','EXECUTE') OR has_function_privilege('service_role','public.register_pilot_geometry_batch(jsonb)','EXECUTE') THEN RAISE EXCEPTION 'Importer exposed';END IF;
 IF has_table_privilege('anon','public.pilot_side_geometry','SELECT') THEN RAISE EXCEPTION 'Private geometry view exposed';END IF;
END;$$;
BEGIN;
INSERT INTO auth.users(id,email_confirmed_at) VALUES('00000000-0000-0000-0000-000000000301',now());
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000301',true);
SET LOCAL ROLE authenticated;
SELECT public.pilot_section_schedules(145.099,-37.883,145.101,-37.881);
SELECT public.pilot_section_schedules(145.162,-37.95,145.164,-37.948);
RESET ROLE;
ROLLBACK;
