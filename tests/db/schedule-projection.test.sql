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
SELECT '00000000-0000-0000-0000-000000000030','00000000-0000-0000-0000-000000000020',1,1,t,encode(digest(t,'sha256'),'hex'),now()
FROM (SELECT '{"schemaVersion":1,"sectionId":"00000000-0000-0000-0000-000000000020","geometryVersion":1,"verification":"unverified","confidenceLevel":1,"lastVerifiedAt":null,"changeState":"none","rules":[{"id":"fixture"}]}'::text t) fixture;
INSERT INTO public.revision_publication(revision_id,published_at,verification,verified_at,confidence_level,change_state)
VALUES ('00000000-0000-0000-0000-000000000030',now(),'admin_verified',now(),4,'disputed');
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM public.server_section_schedules(144.499,-37.9,144.501,-37.898,now(),now()+interval '1 hour'); RAISE EXCEPTION 'Anonymous schedule bypass';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END; $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN PERFORM public.server_section_schedules(144.499,-37.9,144.501,-37.898,now(),now()+interval '1 hour'); RAISE EXCEPTION 'Authenticated schedule bypass';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END; $$;
RESET ROLE;
SET LOCAL ROLE service_role;
DO $$ DECLARE result jsonb; schedule jsonb; BEGIN
 result:=public.server_section_schedules(144.499,-37.9,144.501,-37.898,now(),now()+interval '1 hour');
 schedule:=result->'sections'->0->'schedule';
 IF schedule->>'verification'<>'admin_verified' OR schedule->>'confidenceLevel'<>'4' OR schedule->>'changeState'<>'disputed' THEN
 RAISE EXCEPTION 'Trusted review metadata not overlaid'; END IF;
 IF result::text ~ 'contributor_id|private_evidence_reference|canonical_text' THEN RAISE EXCEPTION 'Private evidence leak'; END IF;
 BEGIN PERFORM public.server_section_schedules(144.499,-37.9,144.501,-37.898,now(),now()); RAISE EXCEPTION 'Invalid stay accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END; $$;
RESET ROLE;
INSERT INTO public.rule_revision(id,section_id,geometry_version,schema_version,canonical_text,content_hash,submitted_at)
SELECT '00000000-0000-0000-0000-000000000031',section_id,geometry_version,schema_version,canonical_text,content_hash,submitted_at
FROM public.rule_revision;
INSERT INTO public.revision_publication(revision_id,published_at,verification,verified_at,confidence_level)
VALUES ('00000000-0000-0000-0000-000000000031',now(),'admin_verified',now(),3);
SET LOCAL ROLE service_role;
DO $$ BEGIN
 IF public.server_section_schedules(144.499,-37.9,144.501,-37.898,now(),now()+interval '1 hour')->'sections'->0->'schedule' <> 'null'::jsonb THEN
 RAISE EXCEPTION 'Ambiguous published revisions silently selected'; END IF;
END; $$;
RESET ROLE;
UPDATE public.revision_publication SET published_at=NULL WHERE revision_id='00000000-0000-0000-0000-000000000031';
UPDATE public.revision_publication SET confidence_level=NULL;
SET LOCAL ROLE service_role;
DO $$ BEGIN
 IF public.server_section_schedules(144.499,-37.9,144.501,-37.898,now(),now()+interval '1 hour')->'sections'->0->'schedule' <> 'null'::jsonb THEN
 RAISE EXCEPTION 'Missing review confidence trusted'; END IF;
END; $$;
RESET ROLE;
ROLLBACK;
