BEGIN;
-- Apply AFTER the application uses migration 026. No table or parking row is changed.
REVOKE ALL ON FUNCTION public.pilot_section_schedules(double precision,double precision,double precision,double precision) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.town_centre_preview(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.town_centre_preview(text) TO service_role;
REVOKE ALL ON FUNCTION public.public_section_projection(double precision,double precision,double precision,double precision,integer) FROM PUBLIC,anon,authenticated;
-- Legacy published-rule tables are read through trusted server functions, not bulk browser SELECTs.
REVOKE SELECT ON public.rule_revision,public.rule_clause,public.revision_publication FROM anon,authenticated;
COMMIT;
