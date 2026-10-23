BEGIN;
-- Mutable review metadata belongs to publication, not immutable submitted claims.
ALTER TABLE public.revision_publication ADD COLUMN confidence_level integer
 CHECK (confidence_level BETWEEN 3 AND 5);
ALTER TABLE public.revision_publication ADD COLUMN change_state text NOT NULL DEFAULT 'none'
 CHECK (change_state IN ('none','change_reported','disputed'));
CREATE FUNCTION public.server_section_schedules(west double precision,south double precision,
 east double precision,north double precision,arrival timestamptz,departure timestamptz,
 requested_limit integer DEFAULT 1000)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE projection jsonb; payload jsonb;
BEGIN
 IF current_setting('role',true) IS DISTINCT FROM 'service_role' THEN
  RAISE EXCEPTION 'Trusted server required' USING ERRCODE='42501';
 END IF;
 IF arrival IS NULL OR departure IS NULL OR NOT isfinite(arrival) OR NOT isfinite(departure) OR departure<=arrival THEN
  RAISE EXCEPTION 'Invalid stay' USING ERRCODE='22023';
 END IF;
 projection:=public.public_section_projection(west,south,east,north,requested_limit);
 SELECT COALESCE(jsonb_agg(item || jsonb_build_object('schedule',candidate.schedule)), '[]'::jsonb)
 INTO payload FROM jsonb_array_elements(projection->'sections') item
 LEFT JOIN LATERAL (
  SELECT CASE WHEN count(*)=1 THEN (jsonb_agg(r.canonical_schedule || jsonb_build_object(
   'verification',p.verification,'lastVerifiedAt',to_char(p.verified_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
   'confidenceLevel',p.confidence_level,'changeState',p.change_state))->0) ELSE NULL END AS schedule
  FROM public.rule_revision r JOIN public.revision_publication p ON p.revision_id=r.id
  WHERE r.section_id=(item->>'sectionId')::uuid AND r.geometry_version=(item->>'geometryVersion')::integer
   AND p.published_at IS NOT NULL AND p.published_at<=now() AND p.verification<>'unverified'
   AND p.verified_at<=now() AND p.confidence_level IS NOT NULL
   AND (r.effective_from IS NULL OR r.effective_from<=arrival)
   AND (r.effective_until IS NULL OR r.effective_until>=departure)
 ) candidate ON true;
 RETURN projection || jsonb_build_object('sections',payload);
END;
$$;
REVOKE ALL ON FUNCTION public.server_section_schedules(double precision,double precision,double precision,double precision,timestamptz,timestamptz,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_section_schedules(double precision,double precision,double precision,double precision,timestamptz,timestamptz,integer) TO service_role;
COMMIT;
