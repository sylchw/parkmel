BEGIN;
INSERT INTO auth.users(id,email_confirmed_at) VALUES('00000000-0000-0000-0000-000000000302',now());
CREATE TEMP TABLE coverage_locations AS SELECT name,public.ST_X(public.ST_PointOnSurface(geom)) AS longitude,
 public.ST_Y(public.ST_PointOnSurface(geom)) AS latitude FROM public.pilot_coverage_area;
GRANT SELECT ON coverage_locations TO authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000302',true);
SET LOCAL ROLE authenticated;
INSERT INTO public.annotation_draft(owner_id,id,payload,longitude,latitude)
 SELECT auth.uid(),md5(name)::uuid,'{}'::jsonb,longitude,latitude FROM coverage_locations;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.annotation_draft WHERE owner_id=auth.uid())<>14 THEN RAISE EXCEPTION 'New coverage draft save failed';END IF;
 BEGIN
  INSERT INTO public.annotation_draft(owner_id,id,payload,longitude,latitude)
   VALUES(auth.uid(),'00000000-0000-0000-0000-000000000999','{}',144.94,-38.02);
  RAISE EXCEPTION 'Uncovered location accepted';
 EXCEPTION WHEN check_violation THEN NULL;END;
 BEGIN
  UPDATE public.annotation_draft SET longitude=144.94,latitude=-38.02 WHERE owner_id=auth.uid();
  RAISE EXCEPTION 'Uncovered update accepted';
 EXCEPTION WHEN check_violation THEN NULL;END;
 IF has_function_privilege('authenticated','public.enforce_pilot_draft_coverage()','EXECUTE') THEN RAISE EXCEPTION 'Internal trigger exposed';END IF;
END;$$;
RESET ROLE;
ROLLBACK;
