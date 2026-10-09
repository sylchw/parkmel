-- LOCAL ONLY: JWT subject is set by test owner, not proof of live Supabase auth.
BEGIN;
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000070'),('00000000-0000-0000-0000-000000000071'),
 ('00000000-0000-0000-0000-000000000072'),('00000000-0000-0000-0000-000000000073');
INSERT INTO public.profile VALUES
 ('00000000-0000-0000-0000-000000000070','Unverified','unverified','user'),
 ('00000000-0000-0000-0000-000000000071','Eligible','eligible','user'),
 ('00000000-0000-0000-0000-000000000072','Admin','eligible','admin'),
 ('00000000-0000-0000-0000-000000000073','Suspended','suspended','admin');
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
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM * FROM public.profile; RAISE EXCEPTION 'Guest unexpectedly read profiles';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM * FROM public.street_section; RAISE EXCEPTION 'Guest unexpectedly read base geometry';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END; $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000070',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.profile) <> 1 THEN RAISE EXCEPTION 'Profile privacy failed'; END IF;
 IF (SELECT count(*) FROM public.street_section) <> 0 THEN RAISE EXCEPTION 'Unverified base geometry leak'; END IF;
 IF public.is_profile_eligible() OR public.is_profile_admin() THEN RAISE EXCEPTION 'Unverified privilege failed'; END IF;
 BEGIN UPDATE public.profile SET role='admin'; RAISE EXCEPTION 'Self escalation unexpectedly allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END; $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000071',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.street_section) <> 0 THEN RAISE EXCEPTION 'Eligible base geometry bypass'; END IF;
 IF NOT public.is_profile_eligible() OR public.is_profile_admin() THEN RAISE EXCEPTION 'Eligible access failed'; END IF;
 IF (SELECT count(*) FROM public.profile) <> 1 THEN RAISE EXCEPTION 'Eligible profile privacy failed'; END IF;
END; $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000072',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.street_section) <> 1 THEN RAISE EXCEPTION 'Admin base inspection failed'; END IF;
 IF NOT public.is_profile_admin() OR (SELECT count(*) FROM public.profile) <> 4 THEN RAISE EXCEPTION 'Admin inspection failed'; END IF;
 BEGIN INSERT INTO public.profile VALUES ('00000000-0000-0000-0000-000000000074','Forged','eligible','admin');
 RAISE EXCEPTION 'Direct admin mutation unexpectedly allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END; $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000073',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN IF public.is_profile_admin() OR public.is_profile_eligible() THEN RAISE EXCEPTION 'Suspended privilege failed'; END IF; END; $$;
RESET ROLE;
ROLLBACK;
