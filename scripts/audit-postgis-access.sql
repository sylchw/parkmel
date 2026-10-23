-- Read-only operational audit; safe for the Supabase SQL Editor or psql.
SELECT current_user AS session_role,pg_get_userbyid(relowner) AS table_owner,relrowsecurity AS rls_enabled,
 has_table_privilege('anon',oid,'SELECT') AS anon_table_read_grant,
 has_table_privilege('anon',oid,'INSERT,UPDATE,DELETE') AS anon_table_write_grant
FROM pg_class WHERE oid='public.spatial_ref_sys'::regclass;
SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') AND NOT c.relrowsecurity;
SELECT setting FROM pg_db_role_setting s CROSS JOIN LATERAL unnest(s.setconfig) setting WHERE s.setrole=(SELECT oid FROM pg_roles WHERE rolname='authenticator') AND setting LIKE 'pgrst.db_pre_request=%';
SELECT extname FROM pg_extension WHERE extname='pg_graphql';
SELECT * FROM pg_publication_tables WHERE schemaname='public' AND tablename='spatial_ref_sys';
SELECT count(*) AS published_parking_sections FROM public.pilot_publication;
