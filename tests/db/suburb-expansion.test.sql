DO $$ BEGIN
 IF (SELECT count(*) FROM public.pilot_coverage_area)<>16 THEN RAISE EXCEPTION 'Missing new suburb';END IF;
 IF (SELECT count(*) FROM public.pilot_street_side)<>55346 THEN RAISE EXCEPTION 'Missing new street targets';END IF;
 IF EXISTS(SELECT 1 FROM public.pilot_side_geometry WHERE NOT public.ST_IsValid(geom)) THEN RAISE EXCEPTION 'Invalid geometry';END IF;
 IF EXISTS(SELECT 1 FROM public.pilot_publication) THEN RAISE EXCEPTION 'Import invented parking approval';END IF;
END;$$;
