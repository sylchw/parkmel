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
INSERT INTO public.rule_revision(id,section_id,geometry_version,schema_version,canonical_text,content_hash,submitted_at)
SELECT '00000000-0000-0000-0000-000000000030','00000000-0000-0000-0000-000000000020',1,1,
 value,encode(digest(value,'sha256'),'hex'),'2026-10-07T00:00:00Z'
FROM (VALUES ('{"schemaVersion":1,"sectionId":"00000000-0000-0000-0000-000000000020","geometryVersion":1,"rules":[{"type":"free"}]}')) AS fixture(value);
INSERT INTO public.observation VALUES ('00000000-0000-0000-0000-000000000040',
 '00000000-0000-0000-0000-000000000030','00000000-0000-0000-0000-000000000020',1,
 '00000000-0000-0000-0000-000000000050','00000000-0000-0000-0000-000000000001',
 'community','street_view','2026-10-01T00:00:00Z','2020-01-01','2026-10-07T00:00:00Z','private-fixture');
INSERT INTO public.rule_clause VALUES ('00000000-0000-0000-0000-000000000060',
 '00000000-0000-0000-0000-000000000030','{"type":"free"}');
DO $$ BEGIN
 BEGIN
  UPDATE public.rule_revision SET canonical_text = '{}';
  RAISE EXCEPTION 'Revision unexpectedly mutable';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM <> 'Submitted revision and observation history is immutable' THEN RAISE; END IF;
 END;
 BEGIN
  DELETE FROM public.observation;
  RAISE EXCEPTION 'Observation unexpectedly deleted';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM <> 'Submitted revision and observation history is immutable' THEN RAISE; END IF;
 END;
 BEGIN
  INSERT INTO public.rule_clause VALUES ('00000000-0000-0000-0000-000000000061',
   '00000000-0000-0000-0000-000000000030','{"type":"paid"}');
  RAISE EXCEPTION 'Mismatched clause unexpectedly accepted';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM <> 'Clause must belong to its immutable canonical revision' THEN RAISE; END IF;
 END;
 BEGIN
  INSERT INTO public.observation SELECT '00000000-0000-0000-0000-000000000041',revision_id,section_id,2,
    contributor_id,source_id,source_type,evidence_kind,observed_at,source_date,submitted_at,private_evidence_reference FROM public.observation;
  RAISE EXCEPTION 'Wrong geometry reference unexpectedly accepted';
 EXCEPTION WHEN foreign_key_violation THEN NULL; END;
 BEGIN
  INSERT INTO public.observation SELECT '00000000-0000-0000-0000-000000000042',revision_id,section_id,geometry_version,
    contributor_id,source_id,source_type,evidence_kind,observed_at,NULL,submitted_at,private_evidence_reference FROM public.observation;
  RAISE EXCEPTION 'Undated imagery unexpectedly accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  INSERT INTO public.observation SELECT '00000000-0000-0000-0000-000000000043',revision_id,section_id,geometry_version,
    contributor_id,source_id,source_type,evidence_kind,observed_at,source_date,observed_at - interval '1 day',private_evidence_reference FROM public.observation;
  RAISE EXCEPTION 'Backwards submission unexpectedly accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 IF (SELECT source_date FROM public.observation) <> DATE '2020-01-01' THEN RAISE EXCEPTION 'Image date lost'; END IF;
END; $$;
INSERT INTO public.rule_revision(id,section_id,geometry_version,schema_version,canonical_text,content_hash,predecessor_id,submitted_at)
 SELECT '00000000-0000-0000-0000-000000000031',section_id,geometry_version,schema_version,canonical_text,content_hash,id,submitted_at FROM public.rule_revision;
DO $$ BEGIN IF (SELECT count(*) FROM public.rule_revision) <> 2 THEN RAISE EXCEPTION 'Revision history lost'; END IF; END; $$;
ROLLBACK;
