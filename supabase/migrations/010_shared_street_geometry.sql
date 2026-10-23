BEGIN;
-- One centreline per physical junction segment; both side IDs remain unchanged.
CREATE TABLE public.pilot_street_segment(id uuid PRIMARY KEY,geom public.geometry(LineString,4326) NOT NULL,source text NOT NULL DEFAULT 'OpenStreetMap / ODbL');
ALTER TABLE public.pilot_street_segment ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pilot_street_segment FROM anon,authenticated;
GRANT SELECT ON public.pilot_street_segment TO authenticated;
CREATE POLICY pilot_segment_read ON public.pilot_street_segment FOR SELECT TO authenticated USING(public.can_write_pilot_draft());
INSERT INTO public.pilot_street_segment(id,geom) SELECT DISTINCT md5(encode(public.ST_AsEWKB(geom),'hex'))::uuid,geom FROM public.pilot_street_side;
CREATE INDEX pilot_segment_spatial ON public.pilot_street_segment USING gist(geom);
ALTER TABLE public.pilot_street_side ADD COLUMN segment_id uuid REFERENCES public.pilot_street_segment(id);
DROP TRIGGER pilot_geometry_immutable ON public.pilot_street_side;
UPDATE public.pilot_street_side SET segment_id=md5(encode(public.ST_AsEWKB(geom),'hex'))::uuid;
ALTER TABLE public.pilot_street_side ALTER COLUMN segment_id SET NOT NULL;
ALTER TABLE public.pilot_street_side DROP COLUMN geom;
CREATE INDEX pilot_side_segment ON public.pilot_street_side(segment_id);
CREATE TRIGGER pilot_geometry_immutable BEFORE UPDATE OR DELETE ON public.pilot_street_side FOR EACH ROW EXECUTE FUNCTION public.reject_evidence_mutation();
CREATE TRIGGER pilot_segment_immutable BEFORE UPDATE OR DELETE ON public.pilot_street_segment FOR EACH ROW EXECUTE FUNCTION public.reject_evidence_mutation();
CREATE OR REPLACE FUNCTION public.pilot_section_schedules(west double precision,south double precision,east double precision,north double precision) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path='' AS $$
BEGIN
 IF NOT public.can_write_pilot_draft() THEN RAISE EXCEPTION 'Eligible account required' USING ERRCODE='42501';END IF;
 IF (west<east AND south<north AND west>=145.03 AND east<=145.10 AND south>=-37.91 AND north<=-37.86) IS NOT TRUE OR public.ST_Area(public.ST_MakeEnvelope(west,south,east,north,4326)::public.geography)>2000000 THEN RAISE EXCEPTION 'Invalid bounds';END IF;
 RETURN (WITH candidates AS (
 SELECT jsonb_build_object('sectionId',s.id,'geometryVersion',1,'streetName',s.street_name,'side',s.side,'startDescription',s.start_description,'endDescription',s.end_description,'geometry',public.ST_AsGeoJSON(g.geom)::jsonb,'schedule',a.payload->'schedule'||jsonb_build_object('verification',p.verification,'confidenceLevel',3,'lastVerifiedAt',to_char(p.verified_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'changeState','none')) AS row
 FROM public.pilot_street_side s JOIN public.pilot_street_segment g ON g.id=s.segment_id JOIN public.pilot_publication p ON p.section_id=s.id JOIN public.pilot_submission a ON a.id=p.submission_id
 WHERE public.ST_Intersects(g.geom,public.ST_MakeEnvelope(west,south,east,north,4326)) ORDER BY s.id LIMIT 1001
 ), numbered AS (SELECT row,row_number() OVER() AS n FROM candidates)
 SELECT jsonb_build_object('sections',COALESCE(jsonb_agg(row) FILTER(WHERE n<=1000),'[]'::jsonb),'truncated',count(*)>1000) FROM numbered);
END;$$;
COMMIT;
