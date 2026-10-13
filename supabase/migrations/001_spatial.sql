-- Q10 local draft: no imports, credentials, provider provisioning or approval claims.
BEGIN;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE TABLE public.source_register (
  id uuid PRIMARY KEY,
  owner text NOT NULL CHECK (length(trim(owner)) > 0),
  url text NOT NULL CHECK (length(trim(url)) > 0),
  licence text NOT NULL CHECK (length(trim(licence)) > 0),
  licence_version text NOT NULL,
  retrieved_at timestamptz NOT NULL,
  allowed_uses text[] NOT NULL CHECK (cardinality(allowed_uses) > 0),
  attribution text NOT NULL,
  refresh_policy text NOT NULL,
  approval_status text NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected'))
);
CREATE TABLE public.locality (
  id uuid PRIMARY KEY,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  boundary geometry(MultiPolygon, 4326) NOT NULL,
  source_id uuid NOT NULL REFERENCES public.source_register(id),
  source_version text NOT NULL CHECK (length(trim(source_version)) > 0),
  attribution text NOT NULL,
  CHECK (ST_IsValid(boundary) AND NOT ST_IsEmpty(boundary) AND
    ST_XMin(Box3D(boundary)) >= -180 AND ST_XMax(Box3D(boundary)) <= 180 AND
    ST_YMin(Box3D(boundary)) >= -90 AND ST_YMax(Box3D(boundary)) <= 90)
);
CREATE TABLE public.precinct (
  id uuid PRIMARY KEY,
  locality_id uuid NOT NULL REFERENCES public.locality(id),
  name text NOT NULL CHECK (length(trim(name)) > 0),
  boundary geometry(MultiPolygon, 4326) NOT NULL,
  source_id uuid NOT NULL REFERENCES public.source_register(id),
  source_version text NOT NULL,
  priority text NOT NULL CHECK (priority IN ('primary', 'adjacent', 'residential')),
  reviewed_rationale text NOT NULL CHECK (length(trim(reviewed_rationale)) > 0),
  survey_denominator integer NOT NULL DEFAULT 0 CHECK (survey_denominator >= 0),
  surveyed_count integer NOT NULL DEFAULT 0 CHECK (surveyed_count >= 0 AND surveyed_count <= survey_denominator),
  CHECK (ST_IsValid(boundary) AND NOT ST_IsEmpty(boundary) AND
    ST_XMin(Box3D(boundary)) >= -180 AND ST_XMax(Box3D(boundary)) <= 180 AND
    ST_YMin(Box3D(boundary)) >= -90 AND ST_YMax(Box3D(boundary)) <= 90)
);
CREATE TABLE public.street_section (
  id uuid NOT NULL,
  geometry_version integer NOT NULL CHECK (geometry_version >= 1),
  locality_id uuid NOT NULL REFERENCES public.locality(id),
  street_name text NOT NULL CHECK (length(trim(street_name)) > 0),
  side text NOT NULL CHECK (side IN ('left', 'right')),
  direction text NOT NULL CHECK (length(trim(direction)) > 0),
  start_description text NOT NULL CHECK (length(trim(start_description)) > 0),
  end_description text NOT NULL CHECK (length(trim(end_description)) > 0),
  geom geometry(LineString, 4326) NOT NULL,
  classification text NOT NULL CHECK (classification = 'on_street'),
  lifecycle text NOT NULL DEFAULT 'active' CHECK (lifecycle IN ('active', 'retired')),
  source_id uuid NOT NULL REFERENCES public.source_register(id),
  source_version text NOT NULL CHECK (length(trim(source_version)) > 0),
  PRIMARY KEY (id, geometry_version),
  CHECK (ST_IsValid(geom) AND NOT ST_IsEmpty(geom) AND ST_Length(geom) > 0)
);
CREATE INDEX locality_boundary_gix ON public.locality USING gist(boundary);
CREATE INDEX precinct_boundary_gix ON public.precinct USING gist(boundary);
CREATE INDEX section_geometry_gix ON public.street_section USING gist(geom);
CREATE FUNCTION public.validate_spatial_provenance() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE allowed text[]; approval text; coverage geometry; candidate geometry;
BEGIN
  SELECT allowed_uses, approval_status INTO allowed, approval FROM public.source_register WHERE id = NEW.source_id;
  IF approval IS DISTINCT FROM 'approved' OR ('geometry' = ANY(allowed)) IS NOT TRUE THEN
    RAISE EXCEPTION 'Geometry requires an explicitly approved source';
  END IF;
  IF TG_TABLE_NAME = 'precinct' OR TG_TABLE_NAME = 'street_section' THEN
    SELECT boundary INTO coverage FROM public.locality WHERE id = NEW.locality_id;
    IF TG_TABLE_NAME = 'precinct' THEN candidate := NEW.boundary; ELSE candidate := NEW.geom; END IF;
    IF coverage IS NULL OR NOT ST_CoveredBy(candidate, coverage) THEN RAISE EXCEPTION 'Geometry outside locality coverage'; END IF;
  END IF;
  IF TG_TABLE_NAME = 'street_section' AND TG_OP = 'UPDATE' THEN
    IF NEW.id IS DISTINCT FROM OLD.id OR NEW.geometry_version IS DISTINCT FROM OLD.geometry_version OR
       ST_AsEWKB(NEW.geom) IS DISTINCT FROM ST_AsEWKB(OLD.geom) OR NEW.side IS DISTINCT FROM OLD.side OR
       NEW.direction IS DISTINCT FROM OLD.direction OR NEW.locality_id IS DISTINCT FROM OLD.locality_id OR
       NEW.start_description IS DISTINCT FROM OLD.start_description OR NEW.end_description IS DISTINCT FROM OLD.end_description OR
       NEW.source_id IS DISTINCT FROM OLD.source_id OR NEW.source_version IS DISTINCT FROM OLD.source_version THEN
      RAISE EXCEPTION 'Create a new geometry version instead of mutating its extent/provenance';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER locality_provenance BEFORE INSERT OR UPDATE ON public.locality FOR EACH ROW EXECUTE FUNCTION public.validate_spatial_provenance();
CREATE TRIGGER precinct_provenance BEFORE INSERT OR UPDATE ON public.precinct FOR EACH ROW EXECUTE FUNCTION public.validate_spatial_provenance();
CREATE TRIGGER section_provenance BEFORE INSERT OR UPDATE ON public.street_section FOR EACH ROW EXECUTE FUNCTION public.validate_spatial_provenance();
-- Default deny before later Q12 role-specific policies exist.
ALTER TABLE public.source_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locality ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.precinct ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.street_section ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.preserve_geometry_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Retire geometry versions; do not delete their history';
END;
$$;
CREATE TRIGGER section_no_delete BEFORE DELETE ON public.street_section
  FOR EACH ROW EXECUTE FUNCTION public.preserve_geometry_history();
COMMIT;
