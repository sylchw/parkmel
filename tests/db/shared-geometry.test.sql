DO $$ BEGIN
 IF (SELECT count(*) FROM public.pilot_street_side)<>3246 THEN RAISE EXCEPTION 'Side identities lost';END IF;
 IF (SELECT count(*) FROM public.pilot_street_segment)>1623 THEN RAISE EXCEPTION 'Geometry not deduplicated';END IF;
 IF EXISTS(SELECT 1 FROM public.pilot_street_side WHERE segment_id IS NULL) THEN RAISE EXCEPTION 'Side has no geometry';END IF;
 IF has_table_privilege('anon','public.pilot_street_segment','SELECT') OR has_table_privilege('authenticated','public.pilot_street_segment','INSERT') THEN RAISE EXCEPTION 'Geometry privileges expanded';END IF;
 IF EXISTS(SELECT 1 FROM public.pilot_street_side GROUP BY segment_id HAVING count(DISTINCT side)<>2) THEN RAISE EXCEPTION 'Two sides lost';END IF;
END;$$;
SELECT count(*) AS shared_segments,pg_size_pretty(pg_total_relation_size('public.pilot_street_segment')) AS geometry_and_indexes FROM public.pilot_street_segment;
BEGIN;
INSERT INTO auth.users(id,email_confirmed_at) VALUES('00000000-0000-0000-0000-000000000300',now());
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000300',true);
SET LOCAL ROLE authenticated;
SELECT public.pilot_section_schedules(145.054,-37.887,145.058,-37.885);
RESET ROLE;
ROLLBACK;
