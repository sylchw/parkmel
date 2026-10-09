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
3. Enter a limit such as 1P, 2P or 3P, tick the days, and choose all day or start/end hours. Mark metered parking when applicable.
4. Add another parking period or a timed special condition, such as tow-away. A condition can optionally apply to only a small part of the section. No sign photo, exact transcription or imagery date is required for this simple community entry.
5. Save a private draft, or confirm the rules and boundaries and submit for review. The detailed editor remains available for legacy drafts.
6. An admin opens `/admin`, reviews limits, days, hours and boundaries, enters a reason and approves or rejects. First publication can also be approved by five distinct verified eligible accounts with matching interpretations. Refresh the map after approval.

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
