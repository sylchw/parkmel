BEGIN;
-- Confirmation promotes only ordinary unverified profiles. Suspensions and admin roles are preserved.
CREATE FUNCTION public.provision_pilot_profile() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 INSERT INTO public.profile(id,public_alias,eligibility,role)
 VALUES (NEW.id,'Contributor',CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN 'eligible' ELSE 'unverified' END,'user')
 ON CONFLICT (id) DO UPDATE SET eligibility = 'eligible'
 WHERE public.profile.eligibility = 'unverified' AND NEW.email_confirmed_at IS NOT NULL;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.provision_pilot_profile() FROM PUBLIC;
CREATE TRIGGER pilot_profile_signup AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
 FOR EACH ROW EXECUTE FUNCTION public.provision_pilot_profile();
INSERT INTO public.profile(id,public_alias,eligibility,role)
 SELECT id,'Contributor',CASE WHEN email_confirmed_at IS NOT NULL THEN 'eligible' ELSE 'unverified' END,'user' FROM auth.users
 ON CONFLICT (id) DO NOTHING;
UPDATE public.profile p SET eligibility='eligible' FROM auth.users u
 WHERE p.id=u.id AND p.eligibility='unverified' AND u.email_confirmed_at IS NOT NULL;
CREATE FUNCTION public.can_write_pilot_draft() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS(SELECT 1 FROM public.profile p JOIN auth.users u ON u.id=p.id
 WHERE p.id=auth.uid() AND p.eligibility='eligible' AND u.email_confirmed_at IS NOT NULL);
$$;
REVOKE ALL ON FUNCTION public.can_write_pilot_draft() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_write_pilot_draft() TO authenticated;
-- Draft identity is provisional: never a published geometry or rule revision.
CREATE TABLE public.annotation_draft (
 owner_id uuid NOT NULL REFERENCES public.profile(id),
 id uuid NOT NULL,
 payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object' AND octet_length(payload::text)<=65536),
 longitude double precision NOT NULL CHECK(longitude BETWEEN 145.03 AND 145.10),
 latitude double precision NOT NULL CHECK(latitude BETWEEN -37.91 AND -37.86),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(owner_id,id)
);
ALTER TABLE public.annotation_draft ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.annotation_draft FROM anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.annotation_draft TO authenticated;
CREATE POLICY draft_read ON public.annotation_draft FOR SELECT TO authenticated
 USING(owner_id=auth.uid() AND public.can_write_pilot_draft());
CREATE POLICY draft_insert ON public.annotation_draft FOR INSERT TO authenticated
 WITH CHECK(owner_id=auth.uid() AND public.can_write_pilot_draft());
CREATE POLICY draft_update ON public.annotation_draft FOR UPDATE TO authenticated
 USING(owner_id=auth.uid() AND public.can_write_pilot_draft())
 WITH CHECK(owner_id=auth.uid() AND public.can_write_pilot_draft());
COMMIT;
