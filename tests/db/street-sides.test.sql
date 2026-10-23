DO $$ BEGIN
 IF (SELECT count(*) FROM public.pilot_street_side)<>3246 THEN RAISE EXCEPTION 'Seed geometry count changed';END IF;
 IF EXISTS(SELECT 1 FROM public.pilot_street_side WHERE NOT public.ST_IsValid(geom) OR public.ST_NPoints(geom)<2) THEN RAISE EXCEPTION 'Invalid seeded geometry';END IF;
 IF EXISTS(SELECT 1 FROM public.pilot_street_side GROUP BY public.ST_AsEWKB(geom) HAVING count(DISTINCT side)<>2) THEN RAISE EXCEPTION 'Missing street side';END IF;
END;$$;
