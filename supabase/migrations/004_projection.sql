BEGIN;
CREATE FUNCTION public.public_section_projection(west double precision, south double precision,
 east double precision, north double precision, requested_limit integer DEFAULT 1000)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE box public.geometry; payload jsonb;
BEGIN
 -- No anonymous direct database bypass: guests use the server's trusted entitlement path.
 IF current_setting('role',true) IS DISTINCT FROM 'service_role' AND
    NOT public.is_profile_eligible() AND NOT public.is_profile_admin() THEN
   RAISE EXCEPTION 'Eligible session or trusted server required' USING ERRCODE = '42501';
 END IF;
 IF west IS NULL OR east IS NULL OR south IS NULL OR north IS NULL OR
    NOT (west >= -180 AND east <= 180 AND south >= -90 AND north <= 90 AND west < east AND south < north) OR
    requested_limit IS NULL OR requested_limit < 1 OR requested_limit > 1000 THEN
   RAISE EXCEPTION 'Invalid projection bounds or limit' USING ERRCODE = '22023';
 END IF;
 box := public.ST_MakeEnvelope(west,south,east,north,4326);
 IF public.ST_Area(box::public.geography) > 2000000 THEN
   RAISE EXCEPTION 'Detail bounds exceed two square kilometres' USING ERRCODE = '22023';
 END IF;
 WITH selected AS (
   SELECT s.* FROM public.street_section s WHERE s.lifecycle = 'active' AND
     s.geom OPERATOR(public.&&) box AND public.ST_Intersects(s.geom,box)
   ORDER BY s.id,s.geometry_version LIMIT requested_limit + 1
 ), bounded AS (SELECT * FROM selected ORDER BY id,geometry_version LIMIT requested_limit)
 SELECT jsonb_build_object('sections', COALESCE(jsonb_agg(jsonb_build_object(
   'sectionId',s.id,'geometryVersion',s.geometry_version,'streetName',s.street_name,
   'side',s.side,'direction',s.direction,'startDescription',s.start_description,'endDescription',s.end_description,
   'geometry',public.ST_AsGeoJSON(s.geom)::jsonb,'category','unknown','confidenceLevel',NULL,
   'sourceLabel','Approved geometry; parking evaluation unavailable')),'[]'::jsonb),
   'truncated',(SELECT count(*) > requested_limit FROM selected),
   'message',CASE WHEN (SELECT count(*) > requested_limit FROM selected) THEN 'Results capped; narrow the area' ELSE NULL END)
 INTO payload FROM bounded s;
 RETURN payload;
END;
$$;
REVOKE ALL ON FUNCTION public.public_section_projection(double precision,double precision,double precision,double precision,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.public_section_projection(double precision,double precision,double precision,double precision,integer) TO authenticated,service_role;
COMMIT;
