BEGIN;
DO $$ BEGIN
 IF has_function_privilege('anon','public.town_centre_preview(text)','EXECUTE') OR has_function_privilege('authenticated','public.town_centre_preview(text)','EXECUTE') OR NOT has_function_privilege('service_role','public.town_centre_preview(text)','EXECUTE') THEN RAISE EXCEPTION 'Preview permissions regressed'; END IF;
 IF has_function_privilege('anon','public.save_profile_settings(text,text)','EXECUTE') THEN RAISE EXCEPTION 'Anonymous settings available'; END IF;
END; $$;
SET LOCAL ROLE service_role;
DO $$ BEGIN
 IF jsonb_array_length(public.town_centre_preview('south-yarra')->'sections')<>0 OR jsonb_array_length(public.town_centre_preview('south-melbourne')->'sections')<>0 THEN RAISE EXCEPTION 'Invented south parking rules'; END IF;
END; $$;
RESET ROLE;
INSERT INTO auth.users(id,email_confirmed_at) VALUES('00000000-0000-0000-0000-000000000410',now());
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000410',true);
DO $$ DECLARE town text; BEGIN
 FOREACH town IN ARRAY ARRAY['south-yarra','south-melbourne'] LOOP
  PERFORM public.save_profile_settings('South suburb contributor',town);
  IF (SELECT favourite_town FROM public.profile WHERE id=auth.uid()) IS DISTINCT FROM town THEN RAISE EXCEPTION 'New favourite town not saved'; END IF;
 END LOOP;
 BEGIN PERFORM public.save_profile_settings('South suburb contributor','unregistered'); RAISE EXCEPTION 'Invalid town accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='Invalid town accepted' THEN RAISE; END IF; END;
END; $$;
RESET ROLE;
ROLLBACK;
