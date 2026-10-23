# CURRENT — 8 October 2026

Coverage expansion: Carnegie plus all 13 requested suburbs (14 areas total), 48,034 distinct street-side targets, with the original 3,246 Carnegie features and IDs preserved unchanged. OSM coordinates are split at shared junctions and way boundaries, then given left/right targets. This is geographic context, not parking permission or a verified sign survey. The selector loads one suburb's geometry at a time and retains the map canvas. Address selection and sign-in return coordinates choose the covered area. New-suburb annotation targets resolve through the trusted server registry.

Hosted: migrations 001–009 and 011–013 are applied. Migration 012 registration completed through SQL Editor in checked groups, ending at 48,034 rows. Final hosted geometry audit: 14 coverage areas, zero invalid geometries, street table/index footprint 16 MB, authenticated importer execution denied. Migration 013 permits cloud drafts inside the registered coverage polygons, retaining owner and confirmed-email RLS. Migration 010 remains separately staged and unapproved; hosted storage still duplicates side geometry.

Submission and admin review are implemented, including five-distinct-account approval for first publications and admin-only review of later changes. Real hosted signup, draft/submission/approval still requires a confirmed account and a supported email sender. No admin role is assigned. Guest zoom stays locked with a sign-in notice. No parking publications were invented by the import.

Verification: 337 unit/domain tests, typecheck/lint/build; isolated database checks cover both the hosted schema (skip 010) and normalized schema, including all 14 draft locations and uncovered-location rejection. Chromium/WebKit mobile and desktop checks cover suburb switching, new-suburb annotation return/submission, review UI, search, popup and arrival controls. Browser API responses use fixtures; these do not prove a live user workflow.

See docs/launch-pending.md for email/admin prerequisites, Photon hosting and wider-scale delivery work. Older notes below are historical.

## Historical implementation notes

### 7 October 2026

Verified local cards: Q01–Q14 (including Q13a), Q16–Q19, Q21–Q26, Q29, Q31, Q35, Q45. Q23a narrows validated public response types. See per-card handoffs. Q15a initiation and Q15 callback are locally tested; real Google/Apple provider proof remains. Q20 expiry and wheel/double-click/keyboard locks pass in both browsers; pinch/browser accessibility zoom checks remain. Q27 draft capture/preview/save UI exists but remains needs_review: structured rule editor, connection and mounted persistence/return evidence are outstanding.

User authorized multiple cards, holiday web review and isolated test-tool downloads. Work stayed in ParkMel; no Git metadata; existing work preserved.

Final regression: 39 native +223 Vitest tests (262 total), typecheck, lint and production build passed. Six real database migration/test pairs passed previously. Q23 has 9 boundary/evaluation tests; Q24 has 3 tests plus Chromium/WebKit selection retention, keyboard selection and 360px layout; Q25 has 4 external-coordinate-link tests; Q27 has 3 draft/invalid-JSON tests. Q21 DST/shortcut/layout and Q19 offline canvas/selection checks pass in both engines.

Runtime: Node24.20.0/npm11.19.0, Next15.5.27/React19.0.4. Dedicated Colima context colima-parkmel-tests contains parkmel-testdb PostgreSQL17/PostGIS3.6.4 with no network/published ports. Local auth fixture is not Supabase provider proof. Playwright runtimes reside in work/playwright-browsers. Default Docker context remains unresponsive; cleanup of attempted parkmel-qtests-20261007 container is unconfirmed. Do not restart unrelated services.

Contracts: schema v1; immutable geometry/revisions/observations; separate mutable publication review state; RLS. Q13a supplies server-only published schedules, null for ambiguity/missing trusted confidence. Q23 validates geometry/schedules, evaluates entire stay, redacts private evidence and excludes unknown/stale/disputed by default. Guests require signed server allowance and server-now 45-minute stay. Protected users may inspect unknown results. Responses private/no-store. No hosted HTTP integration proof. Anonymous identity clearing remains a soft deterrent limitation.

Holiday review covers metropolitan Melbourne2026 only; other regions/years unknown. Complex overlap/time-limit/DST semantics remain unknown. Source/licence/live/field gates: state/operator/source-checks.md.

Next: bounded Q27a structured rule editor; Q27b mounted draft persistence/return; Q17b guest bootstrap/meter routes; app integration suffix. Components remain unwired to homepage. No release readiness claimed.

8 October update: Q15b email/password routes and /sign-in implemented; hosted confirmation/profile/admin setup pending. Anonymous/unverified annotation controls denied; eligible/admin UI allowed, server transaction still pending. Personal-use Street View manual entry requested with imagery provenance retained. Google/Apple deferred. Latest regression 272 tests, typecheck/lint/build pass.

8 October connected pilot update: homepage now mounts stay selection, evaluated results, optional map overlay, server eligibility status, and a signed-in annotation workspace. Structured rule editing, explicit active periods, panel-rule checkboxes, source dates/references, automatic browser retention, JSON export, account backup and latest-account-draft restore are implemented. Session and draft routes re-check server eligibility; writes check Origin and use the user's RLS-backed Supabase session. Migration 007 provisions ordinary profiles and verified-email eligibility without changing suspended status or assigning admin roles. Submission remains disabled until publication transactions and approved geometry are connected. No hosted migrations applied by this change. See docs/pilot-setup.md.

APP01 verification: 283 unit/domain tests, typecheck, lint, build, seven database migration/test pairs, and Chromium/WebKit pilot interaction checks passed. See state/handoffs/APP01.md for scope and remaining hosted/publication gaps.

Hosted setup 8 October: user explicitly confirmed remaining setup. Safari SQL Editor applied migrations 001–007 atomically with public PostGIS / extensions pgcrypto; 12 app tables all RLS-enabled, anonymous draft SELECT/INSERT denied, authenticated draft INSERT granted subject to RLS, profile trigger installed, no profiles yet. service_role parking projection returned empty sections successfully. Site URL and exact production /auth/callback saved. Verified Email/Confirm email enabled, anonymous sign-in disabled. Custom SMTP off; live signup and cloud draft write not tested.
