DO $$ BEGIN
 IF (SELECT count(*) FROM public.pilot_coverage_area)<>17 THEN RAISE EXCEPTION 'Missing Hawthorn';END IF;
 IF (SELECT count(*) FROM public.pilot_street_side)<>59270 THEN RAISE EXCEPTION 'Missing Hawthorn sides';END IF;
 IF EXISTS(SELECT 1 FROM public.pilot_side_geometry WHERE NOT public.ST_IsValid(geom)) THEN RAISE EXCEPTION 'Invalid geometry';END IF;
 IF EXISTS(SELECT 1 FROM public.pilot_publication) THEN RAISE EXCEPTION 'Import invented approvals';END IF;
END;$$;
