BEGIN;
-- Expand the old rectangle while retaining database enforcement of exact coverage.
-- This changes constraints only; no draft data, ownership or RLS policies change.
CREATE FUNCTION public.enforce_pilot_draft_coverage() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.pilot_coverage_area c
  WHERE public.ST_Covers(c.geom,public.ST_SetSRID(public.ST_MakePoint(NEW.longitude,NEW.latitude),4326))) THEN
  RAISE EXCEPTION 'Draft location outside registered coverage' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END;$$;
REVOKE ALL ON FUNCTION public.enforce_pilot_draft_coverage() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER pilot_draft_coverage BEFORE INSERT OR UPDATE OF longitude,latitude ON public.annotation_draft
 FOR EACH ROW EXECUTE FUNCTION public.enforce_pilot_draft_coverage();
ALTER TABLE public.annotation_draft DROP CONSTRAINT annotation_draft_longitude_check,
 DROP CONSTRAINT annotation_draft_latitude_check,
 ADD CONSTRAINT annotation_draft_longitude_check CHECK(longitude BETWEEN 144.9 AND 145.3),
 ADD CONSTRAINT annotation_draft_latitude_check CHECK(latitude BETWEEN -38.05 AND -37.78);
COMMIT;
