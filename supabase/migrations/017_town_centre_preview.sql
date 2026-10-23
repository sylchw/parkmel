BEGIN;
CREATE FUNCTION public.town_centre_preview(region text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path='' AS $$
DECLARE longitude double precision;latitude double precision;box public.geometry;
BEGIN
 SELECT c.x,c.y INTO longitude,latitude FROM (VALUES
('carnegie',145.05914649,-37.88646460),
('chadstone',145.08332580,-37.88609497),
('bentleigh',145.0369346,-37.9175354),
('brighton',144.9966,-37.9151),
('malvern',145.0290,-37.8567),
('oakleigh',145.0913,-37.8985),
('clayton',145.12061666,-37.92457207),
('springvale',145.15364464,-37.94945922),
('mulgrave',145.1890,-37.9358),
('clayton-south',145.1202,-37.9275),
('moorabbin',145.0367,-37.9344),
('hampton',145.0014764,-37.9381127),
('st-kilda',144.9801,-37.8689),
('glen-waverley',145.1640,-37.8807),
('malvern-east',145.0601,-37.8760),
('oakleigh-south',145.0926,-37.9254)) AS c(id,x,y) WHERE c.id=region;
 IF longitude IS NULL THEN RAISE EXCEPTION 'Unknown town centre' USING ERRCODE='22023';END IF;
 box=public.ST_MakeEnvelope(longitude-.0045,latitude-.0035,longitude+.0045,latitude+.0035,4326);
 RETURN (WITH candidates AS (
 SELECT jsonb_build_object('sectionId',s.id,'geometryVersion',1,'streetName',s.street_name,'side',s.side,'startDescription',s.start_description,'endDescription',s.end_description,'geometry',public.ST_AsGeoJSON(g.geom)::jsonb,
 'schedule',jsonb_build_object('schemaVersion',1,'sectionId',s.id,'geometryVersion',1,'completeness','complete','coverage','full_schedule','verification',p.verification,'confidenceLevel',3,'lastVerifiedAt',to_char(p.verified_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'changeState','none','rules',(
 SELECT jsonb_agg((r.value-'source'-'id')||jsonb_build_object('id','preview-rule-'||r.ordinality,'source',jsonb_build_object('type',r.value->'source'->'type','identifier','town-centre-preview','evidenceKind',r.value->'source'->'evidenceKind','observedAt',r.value->'source'->'observedAt','submittedAt',r.value->'source'->'submittedAt','sourceDate',r.value->'source'->'sourceDate'))) FROM jsonb_array_elements(a.payload->'schedule'->'rules') WITH ORDINALITY AS r(value,ordinality)))) AS row
 FROM public.pilot_street_side s JOIN public.pilot_side_geometry g ON g.id=s.id JOIN public.pilot_publication p ON p.section_id=s.id JOIN public.pilot_submission a ON a.id=p.submission_id
 WHERE a.status='approved' AND a.payload->'schedule'->>'completeness'='complete' AND a.payload->'schedule'->>'coverage'='full_schedule' AND public.ST_Intersects(g.geom,box) ORDER BY s.id LIMIT 501
 ), numbered AS(SELECT row,row_number() OVER() AS n FROM candidates)
 SELECT jsonb_build_object('sections',COALESCE(jsonb_agg(row) FILTER(WHERE n<=500),'[]'::jsonb),'truncated',count(*)>500) FROM numbered);
END;$$;
REVOKE ALL ON FUNCTION public.town_centre_preview(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.town_centre_preview(text) TO anon,authenticated;
COMMENT ON FUNCTION public.town_centre_preview(text) IS 'Fixed small town-centre windows; approved schedules only, sanitized evidence, no contributor data or arbitrary bounds.';
COMMIT;
