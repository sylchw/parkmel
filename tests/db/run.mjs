// Dedicated local test container only. Never accepts a production DATABASE_URL.
import {checkQuotaConcurrency} from "./quota-concurrency.mjs";
import {checkConcurrency} from "./concurrency.mjs";
import {spawnSync} from "node:child_process";
import {readFileSync} from "node:fs";
const context="colima-parkmel-tests", container="parkmel-testdb";
const database=`parkmel_check_${Date.now()}`;
function sql(text, db=database) {
 const result=spawnSync("docker",["--context",context,"exec","-i",container,"psql","-U","postgres","-d",db,"-v","ON_ERROR_STOP=1","-q"],
  {input:text,encoding:"utf8",timeout:120000});
 if(result.error || result.status!==0) throw new Error(result.stderr || result.error?.message || "Database check failed");
 return result.stdout;
}
try {
 sql(`CREATE DATABASE ${database};`,"postgres");
 for(const [migration,test] of [["001_spatial.sql","spatial.test.sql"],["002_revisions.sql","revisions.test.sql"],
  ["003_security.sql","security.test.sql"],["004_projection.sql","projection.test.sql"],["005_guest.sql","guest.test.sql"],["006_schedule_projection.sql","schedule-projection.test.sql"],["007_pilot_drafts.sql","pilot-drafts.test.sql"],["008_pilot_review.sql","pilot-review.test.sql"],["009_carnegie_street_sides.sql","street-sides.test.sql"],["010_shared_street_geometry.sql","shared-geometry.test.sql"],["011_multi_suburb_coverage.sql","multi-coverage.test.sql"],["012_suburb_street_sides.sql","suburb-registration.test.sql"],["013_suburb_draft_coverage.sql","suburb-drafts.test.sql"],["014_quick_parking_entries.sql","quick-parking.test.sql"],["015_optional_review_reason.sql","optional-review-reason.test.sql"],["016_malvern_east_oakleigh_south.sql","suburb-expansion.test.sql"],["017_town_centre_preview.sql","town-preview.test.sql"],["018_hawthorn.sql","hawthorn.test.sql"],["019_hawthorn_preview.sql","hawthorn-preview.test.sql"],["020_revision_aware_reviews.sql","revision-reviews.test.sql"],["021_review_rpc_permissions.sql","review-permissions.test.sql"],["022_publication_retry_identity.sql","publication-retry.test.sql"],["023_accounts_and_reviewers.sql","accounts-reviewers.test.sql"],["024_consensus_recovery.sql","consensus-recovery.test.sql"],["025_database_conflict_validation.sql","database-conflict.test.sql"],["026_read_quotas.sql","read-quotas.test.sql"],["027_server_only_parking_reads.sql","server-only-parking-reads.test.sql"],["028_postgis_api_guard.sql","postgis-api-guard.test.sql"],["029_south_yarra_south_melbourne.sql","south-expansion.test.sql"],["030_south_town_centres.sql","south-town-centres.test.sql"],["031_multi_section_contributions.sql","multi-section.test.sql"]]) {
  if(process.argv.includes("--legacy-geometry")&&migration==="010_shared_street_geometry.sql")continue;
  if(migration==="003_security.sql") sql(readFileSync("tests/db/local-auth.sql","utf8"));
  if(migration==="021_review_rpc_permissions.sql")sql("GRANT EXECUTE ON FUNCTION public.review_pilot_annotation_current(uuid,text,text,uuid) TO anon;");
  if(migration==="029_south_yarra_south_melbourne.sql")sql("CREATE SCHEMA expansion_test; CREATE TABLE expansion_test.before_sides AS SELECT array_agg(id) AS ids,md5(string_agg(to_jsonb(s)::text,'' ORDER BY id)) AS fingerprint FROM public.pilot_street_side s;");
  sql(readFileSync(`supabase/migrations/${migration}`,"utf8"));
  sql(readFileSync(`tests/db/${test}`,"utf8"));
  if(migration==="022_publication_retry_identity.sql")sql(readFileSync("tests/db/revision-reviews.test.sql","utf8"));
  console.log(`${migration}: migration and ${test} passed`);
  if(migration==="010_shared_street_geometry.sql")console.log(sql("SELECT count(*) AS shared_segments,pg_size_pretty(pg_total_relation_size('public.pilot_street_segment')) AS geometry_and_indexes FROM public.pilot_street_segment;"));
 }
 await checkQuotaConcurrency({sql,context,container,database});
 await checkConcurrency({sql,context,container,database});
} finally {
 // Only this run's uniquely named database in the dedicated ParkMel test container.
 sql(`DROP DATABASE IF EXISTS ${database};`,"postgres");
}
