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
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000071'),('00000000-0000-0000-0000-000000000070');
INSERT INTO public.profile VALUES ('00000000-0000-0000-0000-000000000071','Eligible','eligible','user'),
 ('00000000-0000-0000-0000-000000000070','Unverified','unverified','user');
INSERT INTO public.street_section SELECT md5('synthetic'||g)::uuid,1,locality_id,street_name,side,direction,
 start_description,end_description,geom,classification,lifecycle,source_id,source_version
 FROM public.street_section CROSS JOIN generate_series(1,1000) g;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000071',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE result jsonb; BEGIN
 result := public.public_section_projection(144.499,-37.9,144.501,-37.898,1000);
 IF jsonb_array_length(result->'sections') <> 1000 OR result->>'truncated' <> 'true' THEN RAISE EXCEPTION 'Projection cap failed'; END IF;
 IF result::text ~ 'contributor|private_evidence|source_id|canonical|email|provider' THEN RAISE EXCEPTION 'Private projection leak'; END IF;
 IF (SELECT count(*) FROM public.street_section) <> 0 THEN RAISE EXCEPTION 'Base-table bypass'; END IF;
 BEGIN PERFORM public.public_section_projection(144,-38,145,-37); RAISE EXCEPTION 'Oversized bbox accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN PERFORM public.public_section_projection(144.5,-37.9,144.4,-37.898); RAISE EXCEPTION 'Reversed bbox accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN PERFORM public.public_section_projection(144.499,-37.9,144.501,-37.898,1001); RAISE EXCEPTION 'Oversized limit accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END; $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000070',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN PERFORM public.public_section_projection(144.499,-37.9,144.501,-37.898); RAISE EXCEPTION 'Unverified projection bypass';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END; $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM public.public_section_projection(144.499,-37.9,144.501,-37.898); RAISE EXCEPTION 'Guest projection bypass';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END; $$;
RESET ROLE;
SET LOCAL ROLE service_role;
DO $$ BEGIN
 IF jsonb_array_length(public.public_section_projection(144.499,-37.9,144.501,-37.898,1)->'sections') <> 1 THEN RAISE EXCEPTION 'Trusted server projection failed'; END IF;
END; $$;
RESET ROLE;
SET LOCAL enable_seqscan = off;
DO $$ DECLARE row record; found boolean := false; BEGIN
 FOR row IN EXECUTE 'EXPLAIN SELECT id FROM public.street_section WHERE geom && public.ST_MakeEnvelope(144.499,-37.9,144.501,-37.898,4326)' LOOP
  IF row."QUERY PLAN" LIKE '%section_geometry_gix%' THEN found := true; END IF;
 END LOOP;
 IF NOT found THEN RAISE EXCEPTION 'Spatial index unavailable to bounded query'; END IF;
END; $$;
ROLLBACK;
