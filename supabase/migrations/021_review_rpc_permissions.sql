BEGIN;
-- Supabase defaults may grant anon directly, independently of PUBLIC.
REVOKE ALL ON FUNCTION public.review_pilot_annotation_current(uuid,text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_pilot_annotation_current(uuid,text,text,uuid) TO authenticated;
COMMIT;
