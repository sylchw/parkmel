BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE public.rule_revision (
  id uuid PRIMARY KEY,
  section_id uuid NOT NULL,
  geometry_version integer NOT NULL,
  schema_version integer NOT NULL CHECK (schema_version = 1),
  canonical_text text NOT NULL,
  canonical_schedule jsonb GENERATED ALWAYS AS (canonical_text::jsonb) STORED,
  content_hash text NOT NULL CHECK (content_hash ~ '^[0-9a-f]{64}$' AND
    content_hash = encode(digest(canonical_text, 'sha256'), 'hex')),
  predecessor_id uuid,
  submitted_at timestamptz NOT NULL,
  effective_from timestamptz,
  effective_until timestamptz,
  UNIQUE(id, section_id),
  UNIQUE(id, section_id, geometry_version),
  FOREIGN KEY(section_id, geometry_version) REFERENCES public.street_section(id, geometry_version),
  FOREIGN KEY(predecessor_id, section_id) REFERENCES public.rule_revision(id, section_id),
  CHECK (predecessor_id IS DISTINCT FROM id),
  CHECK (effective_until IS NULL OR (effective_from IS NOT NULL AND effective_until > effective_from)),
  CHECK ((jsonb_typeof(canonical_schedule) = 'object' AND
    canonical_schedule->>'schemaVersion' = schema_version::text AND
    canonical_schedule->>'sectionId' = section_id::text AND
    canonical_schedule->>'geometryVersion' = geometry_version::text AND
    jsonb_typeof(canonical_schedule->'rules') = 'array' AND
    jsonb_array_length(canonical_schedule->'rules') > 0) IS TRUE)
);
CREATE TABLE public.rule_clause (
  id uuid PRIMARY KEY,
  revision_id uuid NOT NULL REFERENCES public.rule_revision(id),
  clause jsonb NOT NULL CHECK (jsonb_typeof(clause) = 'object'),
  UNIQUE(revision_id, clause)
);
CREATE TABLE public.observation (
  id uuid PRIMARY KEY,
  revision_id uuid NOT NULL,
  section_id uuid NOT NULL,
  geometry_version integer NOT NULL,
  contributor_id uuid NOT NULL,
  source_id uuid NOT NULL REFERENCES public.source_register(id),
  source_type text NOT NULL CHECK (source_type IN ('official','community','imported')),
  evidence_kind text NOT NULL CHECK (evidence_kind IN ('field','licensed_dataset','street_view','unknown')),
  observed_at timestamptz NOT NULL,
  source_date date,
  submitted_at timestamptz NOT NULL,
  private_evidence_reference text,
  FOREIGN KEY(revision_id, section_id, geometry_version) REFERENCES public.rule_revision(id, section_id, geometry_version),
  CHECK (submitted_at >= observed_at),
  CHECK (source_date IS NULL OR source_date <= (observed_at AT TIME ZONE 'UTC')::date),
  CHECK (evidence_kind <> 'street_view' OR source_date IS NOT NULL)
);
-- Mutable publication/validation state is separate from immutable evidence/content.
CREATE TABLE public.revision_publication (
  revision_id uuid PRIMARY KEY REFERENCES public.rule_revision(id),
  published_at timestamptz,
  verification text NOT NULL DEFAULT 'unverified' CHECK (verification IN ('unverified','community_verified','admin_verified')),
  verified_at timestamptz,
  CHECK ((verification = 'unverified' AND verified_at IS NULL) OR
    (verification <> 'unverified' AND verified_at IS NOT NULL))
);
CREATE TABLE public.observation_validation (
  observation_id uuid PRIMARY KEY REFERENCES public.observation(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','eligible','disqualified','suspended'))
);
CREATE INDEX observation_revision_idx ON public.observation(revision_id);
CREATE INDEX observation_contributor_idx ON public.observation(contributor_id);
CREATE FUNCTION public.reject_evidence_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Submitted revision and observation history is immutable'; END;
$$;
CREATE TRIGGER revision_immutable BEFORE UPDATE OR DELETE ON public.rule_revision FOR EACH ROW EXECUTE FUNCTION public.reject_evidence_mutation();
CREATE TRIGGER observation_immutable BEFORE UPDATE OR DELETE ON public.observation FOR EACH ROW EXECUTE FUNCTION public.reject_evidence_mutation();
CREATE TRIGGER clause_immutable BEFORE UPDATE OR DELETE ON public.rule_clause FOR EACH ROW EXECUTE FUNCTION public.reject_evidence_mutation();
CREATE FUNCTION public.validate_revision_clause() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE schedule jsonb;
BEGIN
 SELECT canonical_schedule INTO schedule FROM public.rule_revision WHERE id = NEW.revision_id;
 IF schedule IS NULL OR (schedule->'rules' @> jsonb_build_array(NEW.clause)) IS NOT TRUE THEN
   RAISE EXCEPTION 'Clause must belong to its immutable canonical revision';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER clause_matches BEFORE INSERT ON public.rule_clause FOR EACH ROW EXECUTE FUNCTION public.validate_revision_clause();
ALTER TABLE public.rule_revision ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rule_clause ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.observation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revision_publication ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.observation_validation ENABLE ROW LEVEL SECURITY;
COMMIT;
