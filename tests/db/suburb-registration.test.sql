DO $$ BEGIN
 IF (SELECT count(*) FROM public.pilot_street_side)<>48034 THEN RAISE EXCEPTION 'Incomplete registration';END IF;
 IF EXISTS(SELECT 1 FROM public.pilot_side_geometry WHERE NOT public.ST_IsValid(geom) OR public.ST_NPoints(geom)<2) THEN RAISE EXCEPTION 'Invalid imported geometry';END IF;
 IF EXISTS(SELECT 1 FROM public.pilot_side_geometry g JOIN public.pilot_street_side s ON s.id=g.id GROUP BY public.ST_AsEWKB(g.geom) HAVING count(DISTINCT s.side)<>2) THEN RAISE EXCEPTION 'Unpaired street side';END IF;
 IF (SELECT count(*) FROM public.pilot_publication)>0 THEN RAISE EXCEPTION 'Import invented parking rules';END IF;
END;$$;
SELECT count(*) AS registered_sides FROM public.pilot_street_side;
