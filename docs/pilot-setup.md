# Pilot database setup

The connected homepage, sign-in status and annotation editor are implemented. Parking results require hosted database setup and real parking records; saved drafts are never published parking rules.

## Supabase

Initial hosted setup completed through Safari on 8 October 2026 for project `fceemqwvbcypextegzce`: migrations 001–007 were applied together in one transaction with PostGIS in `public` and the existing pgcrypto in `extensions`. Verified 12 application tables with RLS enabled, owner-scoped draft policies, denied anonymous draft access, the profile-provisioning trigger, and an empty successful server parking projection. Do not reapply those migrations to this project.

The Site URL is `https://parkmel-kappa.vercel.app`; its `/auth/callback` redirect is saved. Email sign-up and confirmation are enabled; anonymous sign-in is disabled. Custom SMTP is still unconfigured. Account signup/confirmation and actual cloud draft saving still need a live user test.


For a new Supabase project, apply the repository migrations in order:

1. `supabase/migrations/001_spatial.sql`
2. `supabase/migrations/002_revisions.sql`
3. `supabase/migrations/003_security.sql`
4. `supabase/migrations/004_projection.sql`
5. `supabase/migrations/005_guest.sql`
6. `supabase/migrations/006_schedule_projection.sql`
7. `supabase/migrations/007_pilot_drafts.sql`
8. `supabase/migrations/008_pilot_review.sql`
9. `supabase/migrations/009_carnegie_street_sides.sql`
10. `supabase/migrations/010_shared_street_geometry.sql` (optional shared-geometry normalization; skip on the current hosted project until approved)
11. `supabase/migrations/011_multi_suburb_coverage.sql`
12. `supabase/migrations/012_suburb_street_sides.sql`
13. `supabase/migrations/013_suburb_draft_coverage.sql`
14. `supabase/migrations/014_quick_parking_entries.sql`

Check which migrations have already been applied before running them. These files are versioned migrations, not rerunnable setup scripts. Apply only unapplied migrations. Never run `tests/db/local-auth.sql` against Supabase: it is an isolated test fixture.

Migration 007 creates ordinary contributor profiles when accounts are created, promotes them after email confirmation, and provisions existing confirmed accounts. It preserves suspended profiles and existing roles. No account becomes an admin automatically.

It also creates private account draft storage with row-level security. Confirmed eligible contributors can read and write their own drafts. Drafts retain provisional identity and coordinates; they do not create approved street geometry, publish schedules, or establish parking permission.

Enable Email authentication and Confirm email. Set the authentication Site URL to your production Vercel URL and allow its `/auth/callback` redirect. Configure SMTP if inviting users beyond Supabase's built-in email delivery restrictions.

## Vercel

The application uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for authentication. `NEXT_PUBLIC_SUPABASE_ANON_KEY` is a legacy fallback.

Signed-in parking queries and annotation review use the user’s session and need no service-role key. The older guest preview endpoint uses server-only `SUPABASE_SERVICE_ROLE_KEY`. Never give server keys a `NEXT_PUBLIC_` prefix. Private draft saving uses the signed-in user's own session and row-level security, not the service-role key.

A deployment from the updated `main` branch picks up the new interface. The database migration is a separate step; deploying Next.js does not apply it.

## Try it

1. Create an account, confirm the email, and sign in.
2. Open the contribution form for a grey street side. Its junction boundaries are selected automatically.
3. Choose a rule type. No Stopping and other restrictions can be the only rule. For parking allowed, enter a limit such as 1P, 2P or 3P. Tick the days and choose all day or start/end hours. Mark metered parking when applicable.
4. Use **Add another rule** for mixed signs. An all-day parking allowance applies outside whole-section restriction hours. A condition can optionally apply to only a small part of the section. No sign photo, exact transcription or imagery date is required for this simple community entry.
5. Save a private draft, or confirm the rules and boundaries and submit for review. The detailed editor remains available for legacy drafts.
6. An admin opens `/admin`, reviews limits, days, hours and boundaries, optionally enters a reason and approves or rejects. Initial publication and later corrections can also be approved by five distinct verified eligible accounts with matching interpretations against the same publication revision. Refresh the map after approval.

## Remaining pilot limitations

- Complete the real approval/publication smoke test. Verified signup, admin role assignment and live review queue access have now been confirmed.
- Parking observations must be contributed and reviewed; grey geometry contains no inferred rules.
- Guest preview bootstrap/metering and full precinct search integration.
- Transactional rewards, change-report publication, and additional device/field validation.

The map opens around Carnegie and offers 13 additional suburbs in its selector. Carnegie retains its original survey rectangle; the added suburbs use OSM administrative polygons. Draft coordinates must fall inside a registered coverage area. Street geometry loads for the selected suburb. See [admin approval](admin-approval.md) for account setup and the review workflow.

8 October review update: migration 008 is installed and all 3,246 side records from migration 009 are registered in the hosted project. The SQL Editor limit required 200-row batches, verified by the cumulative count. Shared-geometry migration 010 is tested locally and staged; it is awaiting explicit production approval. No admin role has been assigned; the nominated account has not yet been confirmed.

Deployment verification: commit `46e5a7c` is Ready in Vercel Production. The production street index returns 3,246 sides, `/admin` is served and anonymous `/api/admin/reviews` is denied with 403. Safari production search finds Woorayl Street sides and junction sections. This confirms deployment and guest boundaries, not a hosted signed-in contribution.

Before semi-public invitations, follow the [Photon self-hosting plan](photon-self-hosting-plan.md) to move numbered-address search off the shared demo service. The plan is researched; hosting and integration are not yet provisioned.

See [remaining launch tasks](launch-pending.md) for the current prerequisites and deferred work.

Multi-suburb setup update: migrations 011–013 are installed in the hosted project. There are 14 registered coverage areas and 48,034 street-side targets; the hosted audit found zero invalid geometries and a 16 MB street table/index footprint. The import helper is denied to browser accounts. Cloud draft locations now use registered polygons rather than the old Carnegie-only constraints. Existing street rows, account roles and RLS ownership were retained. Do not reapply these migrations to this project. Migration 010 is still separately awaiting approval.

Quick-entry update: migration 014 is installed in the hosted project. Simple entries are explicitly labelled community interpretations, remain unverified on submission, and retain the existing authentication and approval checks. Tow-away is a timed prohibited parking rule.

Admin setup update (8 October 2026): the nominated account is confirmed and eligible; its admin role was assigned after explicit authorization. Its live private review queue is accessible and contains a submitted entry. Real publication approval remains for the admin to perform.

## Server-enforced read quotas

Migration 026 adds durable atomic counters (RLS enabled, no public policies), service-only quota/map functions and role-verified admin/reviewer exemptions. Apply it before deploying the app update. Then apply migration 027 to revoke direct browser execution of the old parking functions and legacy published-rule table reads. No parking records or geometry are deleted.

Regular accounts: map 20/minute and 500/day; external address search 30/minute and 300/day. Calendar days use Australia/Melbourne. All instances and devices share the account budget. Admin/reviewer exemptions are read from confirmed eligible database profiles. Failed quota service calls deny reads.

Guest previews: 120/minute and 3,000/day per keyed IP hash; Vercel supplies the trusted IP header. Existing server-only service credentials provide the HMAC key if no guest-signing key is configured. Raw IPs and search text are not stored in quota counters. The daily preload job prunes counters idle for two days. Daily cached snapshots still avoid repeated full parking queries; HTTP responses are private so a shared CDN cannot bypass per-request metering.

Limit responses use HTTP 429 and Retry-After. Previously loaded map data remains visible. This feature does not repair the separately documented PostGIS spatial_ref_sys ownership warning or prevent screenshots and distributed multi-account scraping.

## PostGIS reference-table REST guard — 22 October 2026

The remaining `rls_disabled_in_public` finding is for Supabase-owned `public.spatial_ref_sys`, a PostGIS coordinate-system lookup table. The application tables have RLS enabled. Project `postgres` cannot change this extension table's ownership/RLS or revoke the managed owner's grants.

Migration **028_postgis_api_guard.sql** installs an invoker-only PostgREST pre-request function and registers it for `authenticator` in the current database. It rejects direct reference-table access, encoded endpoint paths and direct extension-owned PostGIS RPCs. Internal PostGIS calls from application RPCs still work. The migration aborts if another hook needs preservation, GraphQL is installed, the table is in a Realtime publication, or foreign-key embedding needs review. No extension, parking row or geometry is dropped or rewritten.

Verified in Safari: an anonymous zero-row REST query to `spatial_ref_sys` returns the guard's access-denied response; direct `postgis_full_version` RPC also returns access denied. The public preview and signed-in map continue to work, and the publication count remains 60. Full local database migration/permission/concurrency tests pass. `scripts/audit-postgis-access.sql` provides repeatable read-only checks.

**This is an API mitigation, not an RLS repair.** The Advisor still detects the table's unchanged RLS flag and may continue sending alerts. The finding has not been hidden or dismissed. Removing the underlying finding still requires Supabase-owner remediation or a separately planned, backed-up migration of PostGIS out of exposed schemas.

Keep GraphQL disabled and do not add this lookup table to Realtime or expose new views/RPCs over it without reviewing access again. The guard does not protect direct SQL sessions with database credentials. Restore prior hook configuration deliberately if future API middleware is introduced; do not silently replace this guard.

## South Yarra and South Melbourne — 24 October 2026

Applied migrations **029_south_yarra_south_melbourne.sql** and **030_south_town_centres.sql** with the selected-file command-line runner and the saved, TLS-verified database connection. Coverage now includes 19 suburbs and 64,910 street-side targets. The 59,270 prior targets, 64 submissions, 60 publications, review history and profile permissions match their pre-migration integrity fingerprints. No parking rules or approvals were created.

Both new town-centre previews return successfully through the database's trusted server role; direct anonymous/authenticated preview execution remains denied. The app's shared region list also enables both towns in suburb selection, favourite-town settings and daily preview preloading. The separate PostGIS schema/RLS root-fix plan is still unexecuted; migration 028's guard remains installed.

## Multi-section contributions — 24 October 2026

Applied **031_multi_section_contributions.sql** through the selected-file CLI runner. It installs the authenticated atomic batch function without changing existing tables or data. Before/after fingerprints match for 64,910 street-side targets, 65 submissions, 61 publications, review history and profile permissions. Anonymous execution is denied; the function has an empty search path. No production test annotations were submitted.

The contribution UI offers a same-street map/checkbox picker, up to 100 selected sides, all-selected-sides confirmation and the existing separate review/direct-approval actions. The RPC uses independent per-side validation, consensus, revision identities and points. Local tests cover late rollback, duplicate retries, five-account voting, authorization and opposite-order concurrent batches, with mobile/desktop Chromium and WebKit checks. The PostGIS root-fix plan remains separate and unexecuted.
