-- Run migration first in an isolated empty PostGIS test database as its owner.
-- psql -v ON_ERROR_STOP=1 -f supabase/migrations/001_spatial.sql -f tests/db/spatial.test.sql
-- All coordinates and records are invented. Roll back every fixture.
BEGIN;
INSERT INTO public.source_register VALUES
 ('00000000-0000-0000-0000-000000000001', 'Synthetic test', 'urn:parkmel:synthetic',
  'Synthetic test only', '1', '2026-10-07T00:00:00Z', ARRAY['geometry'], 'Synthetic', 'Never import', 'approved'),
 ('00000000-0000-0000-0000-000000000002', 'Pending test', 'urn:parkmel:pending',
  'Unknown', '1', '2026-10-07T00:00:00Z', ARRAY['geometry'], 'Synthetic', 'Never import', 'pending'),
 ('00000000-0000-0000-0000-000000000003', 'Null-use test', 'urn:parkmel:null-use',
  'Synthetic test only', '1', '2026-10-07T00:00:00Z', ARRAY['other',NULL], 'Synthetic', 'Never import', 'approved');
INSERT INTO public.locality VALUES ('00000000-0000-0000-0000-000000000010', 'Invented locality',
 ST_Multi(ST_GeomFromText('POLYGON((144 -38,145 -38,145 -37,144 -37,144 -38))',4326)),
 '00000000-0000-0000-0000-000000000001', '1', 'Synthetic');
INSERT INTO public.street_section VALUES ('00000000-0000-0000-0000-000000000020', 1,
 '00000000-0000-0000-0000-000000000010', 'Invented street', 'left', 'north', 'Fixture A', 'Fixture B',
 ST_GeomFromText('LINESTRING(144.5 -37.9,144.5 -37.8)',4326), 'on_street', 'active',
 '00000000-0000-0000-0000-000000000001', '1');
DO $$
BEGIN
  BEGIN
    UPDATE public.street_section SET classification = 'off_street';
    RAISE EXCEPTION 'Off-street classification unexpectedly accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE public.street_section SET geom = ST_GeomFromText('POINT(144.5 -37.8)',4326);
    RAISE EXCEPTION 'Wrong geometry unexpectedly accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN
    INSERT INTO public.locality SELECT '00000000-0000-0000-0000-000000000011', name, boundary,
      '00000000-0000-0000-0000-000000000002', source_version, attribution FROM public.locality;
    RAISE EXCEPTION 'Pending source unexpectedly accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Geometry requires an explicitly approved source' THEN RAISE; END IF;
  END;
  BEGIN
    UPDATE public.street_section SET geom = ST_GeomFromText('LINESTRING(140 -37.9,140 -37.8)',4326);
    RAISE EXCEPTION 'Outside geometry unexpectedly accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Geometry outside locality coverage' THEN RAISE; END IF;
  END;
  BEGIN
    INSERT INTO public.locality SELECT '00000000-0000-0000-0000-000000000012', name, boundary,
      '00000000-0000-0000-0000-000000000003', source_version, attribution FROM public.locality;
    RAISE EXCEPTION 'NULL allowed-use bypass unexpectedly accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Geometry requires an explicitly approved source' THEN RAISE; END IF;
  END;
  BEGIN
    DELETE FROM public.street_section;
    RAISE EXCEPTION 'Geometry history unexpectedly deleted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Retire geometry versions; do not delete their history' THEN RAISE; END IF;
  END;
  BEGIN
    UPDATE public.street_section SET side = 'right';
    RAISE EXCEPTION 'Existing geometry version unexpectedly mutable';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Create a new geometry version instead of mutating its extent/provenance' THEN RAISE; END IF;
  END;
END;
$$;
UPDATE public.street_section SET lifecycle = 'retired';
INSERT INTO public.street_section SELECT id, 2, locality_id, street_name, 'right', direction,
 start_description, end_description, geom, classification, 'active', source_id, source_version FROM public.street_section;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.street_section) <> 2 THEN RAISE EXCEPTION 'Version history missing'; END IF;
END; $$;
ROLLBACK;
