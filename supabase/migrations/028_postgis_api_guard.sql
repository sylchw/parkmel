BEGIN;
-- Preserve the extension and every spatial/parking row. Do not alter extension-owned grants.
DO $$ DECLARE existing text; BEGIN
 SELECT string_agg(setting,', ') INTO existing FROM pg_db_role_setting s CROSS JOIN LATERAL unnest(s.setconfig) setting
 WHERE s.setrole=(SELECT oid FROM pg_roles WHERE rolname='authenticator') AND s.setdatabase IN (0,(SELECT oid FROM pg_database WHERE datname=current_database())) AND setting LIKE 'pgrst.db_pre_request=%' AND setting<>'pgrst.db_pre_request=public.parkmel_api_guard';
 IF existing IS NOT NULL THEN RAISE EXCEPTION 'An existing Data API hook must be reviewed before installing this guard';END IF;
 IF EXISTS(SELECT 1 FROM pg_extension WHERE extname='pg_graphql') THEN RAISE EXCEPTION 'Review GraphQL exposure before relying on this REST-only guard';END IF;
 IF EXISTS(SELECT 1 FROM pg_publication_tables WHERE schemaname='public' AND tablename='spatial_ref_sys') THEN RAISE EXCEPTION 'Remove reference-table Realtime exposure first';END IF;
 IF EXISTS(SELECT 1 FROM pg_constraint WHERE contype='f' AND confrelid='public.spatial_ref_sys'::regclass) THEN RAISE EXCEPTION 'Review embedded reference-table relationships first';END IF;
END;$$;
CREATE FUNCTION public.parkmel_api_guard() RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE path text:=current_setting('request.path',true);endpoint text;

BEGIN
 -- Encoded endpoint names are not used by ParkMel. Reject them instead of risking a URL-encoding bypass.
 IF path IS NULL OR path='' OR position('%' IN path)>0 OR lower(btrim(path,'/')) ~ '(^|/)spatial_ref_sys$' THEN
  RAISE SQLSTATE '42501' USING MESSAGE='Direct access to this database endpoint is disabled';
 END IF;
 endpoint:=regexp_replace(lower(btrim(path,'/')),'^rest/v1/','');
 -- Block extension-owned RPCs too; PostGIS remains callable internally by application functions.
 IF endpoint LIKE 'rpc/%' AND EXISTS(
  SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_depend d ON d.classid='pg_catalog.pg_proc'::regclass AND d.objid=p.oid AND d.deptype='e'
  JOIN pg_catalog.pg_extension e ON e.oid=d.refobjid WHERE e.extname='postgis' AND p.proname=substring(endpoint FROM 5)
 ) THEN RAISE SQLSTATE '42501' USING MESSAGE='Direct PostGIS function access is disabled';END IF;
END;$$;
REVOKE ALL ON FUNCTION public.parkmel_api_guard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.parkmel_api_guard() TO anon,authenticated,service_role;
COMMENT ON FUNCTION public.parkmel_api_guard() IS 'REST request guard only; prevents direct reference-table access without changing PostGIS data. Does not enable table RLS.';
DO $$ BEGIN EXECUTE format('ALTER ROLE authenticator IN DATABASE %I SET pgrst.db_pre_request = %L',current_database(),'public.parkmel_api_guard');END;$$;
NOTIFY pgrst,'reload config';
COMMIT;
