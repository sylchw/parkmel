DO $$ DECLARE b expansion_test.before_sides;fingerprint text; BEGIN
 SELECT * INTO b FROM expansion_test.before_sides;
 SELECT md5(string_agg(to_jsonb(s)::text,'' ORDER BY id)) INTO fingerprint FROM public.pilot_street_side s WHERE id=ANY(b.ids);
 IF fingerprint IS DISTINCT FROM b.fingerprint THEN RAISE EXCEPTION 'Existing street sides changed'; END IF;
 IF (SELECT count(*) FROM public.pilot_coverage_area)<>19 THEN RAISE EXCEPTION 'Missing south suburbs'; END IF;
 IF (SELECT count(*) FROM public.pilot_street_side)<>64910 THEN RAISE EXCEPTION 'Missing south street sides'; END IF;
 IF EXISTS(SELECT 1 FROM public.pilot_side_geometry WHERE NOT public.ST_IsValid(geom)) THEN RAISE EXCEPTION 'Invalid geometry'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.pilot_coverage_area WHERE id='south-yarra' AND public.ST_Covers(geom,public.ST_SetSRID(public.ST_Point(144.9918537,-37.8377695),4326))) OR NOT EXISTS(SELECT 1 FROM public.pilot_coverage_area WHERE id='south-melbourne' AND public.ST_Covers(geom,public.ST_SetSRID(public.ST_Point(144.9570533,-37.83344),4326))) THEN RAISE EXCEPTION 'Town centre outside new coverage'; END IF;
 IF EXISTS(SELECT 1 FROM public.pilot_publication) THEN RAISE EXCEPTION 'Import invented approvals'; END IF;
END; $$;
DROP SCHEMA expansion_test CASCADE;
