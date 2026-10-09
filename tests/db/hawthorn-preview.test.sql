BEGIN;
SET LOCAL ROLE anon;
DO $$ BEGIN
 IF jsonb_array_length(public.town_centre_preview('hawthorn')->'sections')<>0 THEN RAISE EXCEPTION 'Invented Hawthorn rules';END IF;
END;$$;
RESET ROLE;
ROLLBACK;
