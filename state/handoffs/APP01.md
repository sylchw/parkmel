# APP01 — connected pilot and private drafts

Status: partial (local implementation verified; hosted setup and publication remain).

Scope: homepage composition, read-only server session status, structured annotations, browser retention, account draft backup/restore and verified-email profile provisioning.

Evidence: Next.js 15.5.27 from package.json and installed source, App Router under src/app; npm/package-lock.json; no scoped AGENTS.md found. No formatter script configured. Existing route auth adapters and eligibility policy retained. New client boundaries are for forms, map interaction, fetch lifecycle and browser storage; no service-role credentials enter client code.

Changes:

- PilotApp mounts stay selection, bounded coordinate search, evaluated results and an empty-by-default parking overlay. Synthetic fixtures are not injected into pilot results. Stale requests are discarded after stay/location changes.
- /api/session reports verified server eligibility with private/no-store and Cookie variation.
- ScheduleEditor captures explicit periods, source provenance/date, fee/permit/holiday semantics and maximum stay. Sign panels match rules via checkboxes.
- AnnotationWorkspace retains edits in account-scoped browser storage, exports JSON, saves private drafts via /api/drafts, and restores the latest cloud draft on browsers without a local draft. Coordinates remain bound to the draft. Publishing is deliberately unavailable until trusted publication transactions exist.
- /api/drafts independently enforces server eligibility, same-origin writes, JSON/size/location validation and owner identity from the server. It uses the caller's Supabase session; RLS is the storage authorization boundary.
- Migration 007 provisions ordinary profiles from verified email, preserves suspended accounts/admin roles, and isolates draft owners through RLS. It does not publish a schedule or create approved geometry.
- npm run test:e2e now runs local Next.js with installed Playwright browser engines rather than an unavailable placeholder.

Verification: 283 unit/domain tests (39 native + 244 Vitest) pass; npm run typecheck, npm run lint and npm run build pass. Seven migration/test pairs pass in the dedicated isolated PostgreSQL/PostGIS container. Chromium and WebKit pass guest denial, eligible annotation interaction, save/reload retention, empty results and 360px layout. Browser auth and HTTP data responses are controlled fixtures; this does not prove hosted email/Supabase behavior. No physical-device or field proof.

External actions: committed/pushed only to the authorized ParkMel main branch. Hosted migrations were not applied. docs/pilot-setup.md lists owner setup steps; no admin is automatically assigned and no real parking records are fabricated.

Remaining: approved geometry and published real data, submission/independent-confirmation/admin approval transactions, guest bootstrap/meter HTTP integration, full curated precinct search, transactional rewards and change-report publication. Background map provider remains unconfigured. Draft storage currently restores the latest account draft; a multi-draft management interface is still needed.
