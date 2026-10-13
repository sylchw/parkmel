BEGIN;
CREATE TABLE public.profile (
 id uuid PRIMARY KEY REFERENCES auth.users(id),
 public_alias text NOT NULL CHECK (length(trim(public_alias)) BETWEEN 1 AND 80),
 eligibility text NOT NULL DEFAULT 'unverified' CHECK (eligibility IN ('unverified','eligible','suspended')),
 role text NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin'))
);
ALTER TABLE public.profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.observation ADD CONSTRAINT observation_profile_fk FOREIGN KEY(contributor_id) REFERENCES public.profile(id);
CREATE FUNCTION public.is_profile_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS(SELECT 1 FROM public.profile WHERE id = auth.uid() AND role = 'admin' AND eligibility <> 'suspended');
$$;
CREATE FUNCTION public.is_profile_eligible() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS(SELECT 1 FROM public.profile WHERE id = auth.uid() AND eligibility = 'eligible');
$$;
REVOKE ALL ON FUNCTION public.is_profile_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_profile_eligible() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_profile_admin(),public.is_profile_eligible() TO authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON public.profile,public.observation,public.source_register,public.locality,public.precinct,
 public.street_section,public.rule_revision,public.rule_clause,public.revision_publication,public.observation_validation TO authenticated;
CREATE POLICY profile_read ON public.profile FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_profile_admin());
CREATE POLICY observation_read ON public.observation FOR SELECT TO authenticated USING (contributor_id = auth.uid() OR public.is_profile_admin());
CREATE POLICY source_admin_read ON public.source_register FOR SELECT TO authenticated USING (public.is_profile_admin());
CREATE POLICY locality_admin_read ON public.locality FOR SELECT TO authenticated USING (public.is_profile_admin());
CREATE POLICY precinct_admin_read ON public.precinct FOR SELECT TO authenticated USING (public.is_profile_admin());
CREATE POLICY section_admin_read ON public.street_section FOR SELECT TO authenticated USING (public.is_profile_admin());
CREATE POLICY revision_admin_read ON public.rule_revision FOR SELECT TO authenticated USING (public.is_profile_admin());
CREATE POLICY clause_admin_read ON public.rule_clause FOR SELECT TO authenticated USING (public.is_profile_admin());
CREATE POLICY publication_admin_read ON public.revision_publication FOR SELECT TO authenticated USING (public.is_profile_admin());
CREATE POLICY validation_admin_read ON public.observation_validation FOR SELECT TO authenticated USING (public.is_profile_admin());
-- No direct INSERT/UPDATE/DELETE policies or grants. Future trusted mutation functions own authorization.
COMMIT;
