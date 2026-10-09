// Dedicated local test container only. Never accepts a production DATABASE_URL.
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
  ["003_security.sql","security.test.sql"],["004_projection.sql","projection.test.sql"],["005_guest.sql","guest.test.sql"],["006_schedule_projection.sql","schedule-projection.test.sql"],["007_pilot_drafts.sql","pilot-drafts.test.sql"],["008_pilot_review.sql","pilot-review.test.sql"],["009_carnegie_street_sides.sql","street-sides.test.sql"],["010_shared_street_geometry.sql","shared-geometry.test.sql"],["011_multi_suburb_coverage.sql","multi-coverage.test.sql"],["012_suburb_street_sides.sql","suburb-registration.test.sql"],["013_suburb_draft_coverage.sql","suburb-drafts.test.sql"],["014_quick_parking_entries.sql","quick-parking.test.sql"],["015_optional_review_reason.sql","optional-review-reason.test.sql"],["016_malvern_east_oakleigh_south.sql","suburb-expansion.test.sql"],["017_town_centre_preview.sql","town-preview.test.sql"],["018_hawthorn.sql","hawthorn.test.sql"],["019_hawthorn_preview.sql","hawthorn-preview.test.sql"]]) {
  if(process.argv.includes("--legacy-geometry")&&migration==="010_shared_street_geometry.sql")continue;
  if(migration==="003_security.sql") sql(readFileSync("tests/db/local-auth.sql","utf8"));
  sql(readFileSync(`supabase/migrations/${migration}`,"utf8"));
  sql(readFileSync(`tests/db/${test}`,"utf8"));
  console.log(`${migration}: migration and ${test} passed`);
  if(migration==="010_shared_street_geometry.sql")console.log(sql("SELECT count(*) AS shared_segments,pg_size_pretty(pg_total_relation_size('public.pilot_street_segment')) AS geometry_and_indexes FROM public.pilot_street_segment;"));
 }
} finally {
 // Only this run's uniquely named database in the dedicated ParkMel test container.
 sql(`DROP DATABASE IF EXISTS ${database};`,"postgres");
}
