# ParkMel — historical implementation summary

Recorded 7–8 October 2026 before the connected pilot interface. For the latest changes, see [APP01](../state/handoffs/APP01.md) and [pilot setup](pilot-setup.md).

ParkMel is a development prototype for evaluating on-street parking rules in Melbourne. The repository now contains tested domain logic, database migrations, protected API routes and reusable interface components. **It is not yet a complete, connected application:** the homepage still shows the original prototype message, and the map, search, results and annotation components have not been connected into that page.

## What is implemented

| Area | Implemented behaviour | Current limit |
| --- | --- | --- |
| Foundation (Q01–Q05) | Next.js/React/TypeScript setup, npm checks, versioned parking types, unknown-JSON validation and deterministic canonical schedules. | Local development foundation; no deployment. |
| Melbourne time (Q06) | Strict local-time conversion, rejection of daylight-saving gaps and explicit choice for repeated times. | Complex DST carryover in parking evaluation remains unknown. |
| Holidays (Q07) | Metropolitan Melbourne's 2026 holiday fixture, reviewed against official sources; sign-specific holiday interpretation. | Other years and regional alternatives remain unknown. |
| Parking evaluation (Q08–Q09) | Single-period and whole-stay evaluation; free, paid, restricted and unknown outcomes with reasons and transition information. Incomplete, stale, disputed and unsupported evidence stays unknown. | No inferred free parking from missing rules; complex overlaps and maximum-stay carryover are not resolved. |
| Database (Q10–Q13, Q13a) | Six migrations: spatial geometry/provenance, immutable revisions and observations, role security, bounded geometry projection, server-held guest allowance and trusted published schedules. Publication review state is separate from submitted content. | Tested on isolated PostgreSQL/PostGIS, not a hosted Supabase deployment. |
| Authentication (Q14–Q15, Q15a) | Server verification of user and matching eligible profile; Google/Apple initiation and PKCE callback; retained return URL; private cookie handling and safe errors. | Real provider setup and successful account journeys remain unverified. |
| Guest preview (Q16–Q17, Q20) | Cumulative 120-second allowance, hidden-time pause, signed random identity, server metering, map zoom locks and accessible expiry panel. | Bootstrap/heartbeat HTTP routes and app wiring remain unfinished. Clearing anonymous identity is a soft-deterrent limitation. Signed-out wheel, pinch and double-click attempts show a sign-in notification. Signed-in users can zoom with wheel, pinch and navigation buttons. |
| Map (Q18–Q19) | Default offline schematic, separate invented street sides, category/confidence labels, selection, attribution and list fallback. Optional operator-controlled live style configuration. | Invented examples are not observed parking data. No live tile/provider clearance or field proof. |
| Stay selection (Q21) | Arrival/duration form, DST handling and concrete weekday/weekend/public-holiday shortcuts. | Component awaits application integration. |
| Destination search (Q22) | Eligible-only curated search; bounded queries/results, explicit empty coverage and visibly synthetic fixtures. | No supplied live precinct coverage or external geocoder. |
| Evaluated endpoint (Q23) | `/api/map/sections`: bounded map/stay requests, trusted schedule validation, whole-stay evaluation, guest entitlement checks and explicit public response fields. Unknown/stale/disputed excluded by default; eligible users can inspect unknown results. | Real hosted HTTP transport is unverified. Responses never expose raw schedules, private references or contributor/source identifiers. |
| Results/details (Q24) | Accessible textual categories, endpoints, explanations, confidence and source age; selected section survives list/map switches. | Components are standalone. Space occupancy is explicitly unknown. |
| Street View (Q25) | Validated coordinate hyperlink with `api=1`, panorama action and protected new tab. Original tab retains selection/draft. | No imagery downloaded, embedded or independently verified; a link does not establish transcription rights. |
| Annotation (Q26–Q27) | Draft/publication validation plus form capture for boundaries, sign panels and completeness declaration; safe full-schedule preview and asynchronous draft-saving callbacks. | Q27 is unfinished: structured rule editor, persistence wiring and mounted return-flow checks remain. Incomplete drafts cannot publish as free parking. |
| Confidence (Q29) | Five-level calculation using distinct eligible contributors and canonical agreement; duplicates/contradictions excluded; admin floor without invented votes. | Pure calculation, not a connected voting service. Confidence does not establish freshness. |
| Changes (Q31) | Seven-day distinct-contributor window, warning/replacement/dispute thresholds and latched change state. | Replacement nomination does not publish a revision; serialized server publication remains unfinished. |
| Rewards (Q35) | Contribution priority awards, independent confirmations, duplicate/farming/self-confirmation checks, cooldown and Melbourne daily limits. | Pure eligibility calculation; no transactional reward ledger or redemption. |
| Source review (Q45) | Operator evidence/checklist packet and sourced holiday review. | Licence, coverage, live-service and field gates remain open. |

## Verification completed

The latest full application run passed **262 tests**: 39 native domain tests and 223 Vitest tests across 24 files. Typecheck, lint and production build passed.

Six database migration/test pairs passed against an isolated PostgreSQL 17/PostGIS 3.6.4 container. Its local `auth` fixture tests permission boundaries; it does not prove real Supabase authentication.

Chromium and WebKit checks passed for DST inputs, shortcuts, 360px layout, offline map rendering/selection with zero remote requests, guest wheel/double-click/keyboard locks and expiry focus, and results selection retention across views. These are desktop browser-engine checks, not physical mobile-device or field verification.

## Running the project

Use the existing npm lockfile and dependencies. The verified environment used Node 24.20.0 and npm 11.19.0; the package requires Node 22.18 or later.

```sh
cd /Users/sylvester/Documents/Repo/ParkMel
npm run dev
```

Open the local URL printed by Next.js. At present this opens the minimal homepage, not the assembled parking workflow.

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

`npm run test:db` targets only the dedicated Docker context `colima-parkmel-tests` and container `parkmel-testdb`. They must already be running. The runner creates and drops its own temporary database; it does not use a production `DATABASE_URL`.

Browser evidence currently lives in task-specific harnesses under `work/`. **`npm run test:e2e` remains an unavailable placeholder** and does not run those checks.

## Configuration and routes

Use `.env.example` as a starting point. Auth uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; `NEXT_PUBLIC_SUPABASE_ANON_KEY` remains an optional legacy fallback. Evaluated sections additionally require server-only `SUPABASE_SERVICE_ROLE_KEY`; guest enforcement requires server-only `GUEST_SIGNING_SECRET` of at least 32 bytes. The signing-secret name is included in `.env.example`. Never expose either server secret to browser code.

`PARKMEL_SEARCH_FIXTURE=synthetic` enables labelled invented destinations on the server. Without it, search correctly reports empty coverage. This flag is documented in `.env.example`. The guest allowance currently uses implementation constants; existing allowance/reset environment entries are not wired settings.

Implemented routes:

- `/auth/sign-in?provider=google|apple&next=/relative/path`
- `/auth/callback` for provider code exchange
- `/api/search?q=...` for eligible curated search
- `/api/map/sections` with `west`, `south`, `east`, `north`; eligible requests also supply `arrival`/`departure` and optionally `includeUnknown`

Missing credentials produce explicit unavailable/denied responses. There are no configured provider accounts or imported live parking records claimed by this summary.

## What remains before the app is usable

1. Finish Q27's structured rule editor, draft persistence and external-link return checks.
2. Add guest bootstrap/heartbeat endpoints and connect authenticated/guest state.
3. Connect search, stay selection, map, evaluated results and contributions into the homepage.
4. Implement server contribution/publication, moderation and transactional reward flows from their remaining cards.
5. Supply approved geometry/parking data, verify source rights and complete actual provider/device/field checks.

The earlier missing middle cards were dependencies and verification gaps, not evidence of a finished feature. The database/browser prerequisites now exist; unfinished cards above are still explicitly open.

## Where to read more

- [Current implementation state](../state/CURRENT.md)
- [Per-card implementation handoffs](../state/handoffs/)
- [Task specifications](../planning/qwen-tasks/)
- [Holiday source review](../state/operator/holiday-review.md)
- [Source and release evidence checklist](../state/operator/source-checks.md)

Git was initialized on 8 October 2026 with remote `git@github.com:sylchw/parkmel.git`; the pre-existing GitHub initial commit and licence are preserved. Repository-only author and SSH configuration use the sylchw account. The default Docker context became unresponsive during initial tool setup; cleanup of the attempted task container there is unconfirmed. The working test database is in a separate profile. Do not restart unrelated services to recover it.

## Pilot policy update — 8 October 2026

Coverage is Carnegie, Malvern East, Oakleigh, Clayton and Chadstone. No verified parking dataset has been supplied. The pilot uses email/password with verified email; Google/Apple OAuth is deferred. `/sign-in` and POST `/auth/email` are implemented locally, retaining the confirmation callback and selected return URL. Hosted mail, profile provisioning and admin assignment are still pending.

Anonymous and unverified accounts cannot access annotation controls. Eligible contributors and admins may start drafts; submissions begin unverified. Five distinct eligible contributors agreeing on complete canonical rules or an admin approval establish verification under the existing policy. The database submission and admin approval workflows remain unfinished; UI checks do not replace server enforcement.

Street View hyperlinks are available from the annotation component when coordinates are supplied. User requested personal-use manual transcription; preserve Street View provenance and imagery dates separately from field observation dates. No automatic legal permission or verification is inferred. Structured rule editing and full page integration remain outstanding.

Latest checks: 272 tests (39 native +233 Vitest), typecheck, lint and production build passed. Live email confirmation has not been tested.


## Carnegie map interface — 8 October 2026

The homepage now opens a full-height OpenStreetMap basemap centred on Carnegie. PetrolSpy's compact map search and Parkopedia's floating search/selected-detail layout informed the interface. Search filters recorded street names in the current viewport; it is not an address geocoder. Parking category and arrival/duration controls sit over the map. Actual database sections are drawn along each street side in green (free), amber (paid), red (restricted), or grey (unknown). Selecting a section opens an evidence/details card, with an accessible street-list alternative. Empty coverage invites contributions instead of implying parking eligibility.

Verified signed-in contributors can select a map point and record sign drafts. Multiple local drafts are retained separately, with account draft saves and current-draft export. Drafts are private and do not colour the public map: submission, review and publication still need connection. No fabricated parking records were added.

MapLibre module worker and shared assets are copied from the pinned dependency during dev/build to predictable same-origin paths; this fixes Safari worker loading. Generated assets are ignored by Git and ESLint. OSM attribution remains visible; browser tests intercept tiles rather than request the public tile service. The public tile service is best-effort and should be replaced if usage outgrows its policy.

Validation: production build, lint, TypeScript, 39 domain tests, 244 unit tests, and Chromium/WebKit mobile browser checks passed. Browser checks cover authentication gating, draft retention/switching, empty coverage, overflow and runtime errors. Live approved records and end-to-end publication are not verified.

Public signup still needs an email delivery provider and sender domain. Custom SMTP was not configured because neither is available yet.


## Parking sign colours and grey coverage — 8 October 2026

Replaced the free/paid/restricted-only palette with signed duration and zone categories, combined paid edges, and overstay dashes. Server-derived public display metadata preserves exact limits and uses only evaluator-applied rules. Search filters, street-list labels and selected details share the same categories. Glen Eira and Melbourne council sources and precise band boundaries are recorded in `docs/parking-map-colours.md`.

Added a bundled attributed OSM road-centreline extract for the Carnegie survey rectangle: 897 ways, initially grey. It is available before sign-in and supplies geometry only; it neither invents rules nor bypasses publication. Added a direct sign-in-to-annotate link, signed-in header action and annotation return destination.

Admin role setup, draft recording and the unfinished submission/review/publication flow are explained in `docs/admin-approval.md`. No roles were changed and no hosted migrations were required by this UI/data-projection update.

Validation for this update: lint and TypeScript passed; 39 domain tests and 270 unit tests passed; production build and Chromium/WebKit mobile browser checks passed. Browser checks cover the grey baseline asset with no parking records, the duration/payment legend, selected section details and filters, retained draft switching, overflow, map-load fallback absence and runtime errors. Tests use a local raster fixture and invented parking records; no live parking claims are made from fixtures.


## Street popups — 8 October 2026

Mobile taps and desktop mouse hovers now open an anchored street information box. Recorded coloured sections show street name, side, exact parking limit/payment label and a section-details action. Grey streets invite contribution and include a Google Maps Street View coordinate hyperlink. Visitors receive a sign-in link retaining the selected coordinates and annotation return destination; signed-in contributors can open the draft workspace directly.

Hover boxes stay available while the pointer moves onto their links, and while keyboard focus is inside. Click pins a box; close, Escape and map movement dismiss it. Filtered-out sections clear their stale boxes. Rendered React text escapes street names/rules; external links use noopener/noreferrer. No Google imagery or SDK is fetched by the app.

Verification covers real canvas tap/hover hit testing in Chromium and WebKit on mobile and desktop, grey sign-in/Street View links, direct signed-in contribution, coloured 2P paid details, hover-to-link retention, keyboard focus and Escape. Fixtures are invented test streets, not live parking evidence. Existing admin publication and SMTP gaps are unchanged.

All final checks passed: lint, TypeScript, 39 domain tests, 277 unit tests, production build, and mobile/desktop popup tests in Chromium and WebKit. Prohibited/special-use summaries now retain the specific active zone name, with loading/accessibility duration where present. The earlier grey-road asset was also confirmed live with 897 ways.


## Arrival and duration panel — 8 October 2026

Fixed the dropdown's positioning relative to a narrow trigger column. A dedicated panel now anchors to the full toolbar on desktop and uses the available screen width on mobile. Mobile filter/arrival controls stack instead of competing for one cramped row. Shortcuts use two columns, date/time and duration inputs retain readable 16px text, and the panel scrolls on shorter screens without horizontal overflow. Apply closes the panel and retains the selected stay; an explicit Close button is available.

Production-build browser checks verify panel width and viewport bounds, absence of horizontal form overflow, date/time and duration edits, applying and reopening a 120-minute stay, and explicit closing, on desktop and mobile in Chromium and WebKit. Existing map/draft/popup regression checks remain included.


## Sign-in presentation — 8 October 2026

Replaced native-looking sign-in buttons with consistent full-width primary Sign in and outlined Create account actions. Added a responsive branded form card, spaced labels/inputs, readable text and keyboard focus styles. Authentication routes, submit values and validation are unchanged. Lint, production build and Chromium/WebKit desktop/mobile layout checks passed; the browser checks confirm button sizing, submit-action values and no mobile horizontal overflow.

## 8 October: street search, sides, junctions and review

Street search now reads the complete local street index rather than only approved parking records. Results name the side and junction boundaries and centre the map. The 897 source OSM ways produce 1,623 junction segments / 3,246 independently selectable sides, initially grey. Side identity survives the sign-in return link and is used by new annotation drafts; registered boundaries cannot be edited into a different street.

Added complete annotation submission and an admin queue at `/admin`. The database verifies confirmed-email eligibility, registered geometry and complete unverified payloads; immutable submissions and review events support an audited publication. Five matching distinct accounts can approve initial records, and an admin can approve or reject with a reason. Published changes require admin review. Signed-in map requests read the new publication RPC using the user's session rather than a service-role credential.

Localized restriction extents are explicit percentages along a junction section. Their geometry is drawn separately, while a general 2P rule determines the main colour where parking remains available. Whole-section restrictions, stale evidence and conflicting general clauses remain conservative. Fee amounts can now be entered.

Hosted prerequisites: install migrations 008–010 and create/verify the nominated admin account before granting its role. Migrations 008–009 are now installed in the hosted project; 010 is staged pending separate approval. The app is deployed, but the real signed-in approval smoke test awaits a confirmed account. Verified-email delivery still needs a supported sender configuration for users outside the Supabase team's permitted recipients.

Both sides now share one database geometry through migration 010. The pilot stores 1,623 geometries with a 440 KB measured local geometry/index footprint. Citywide vector tiles and region imports remain future scaling work; the pilot does not download metropolitan geometry or claim free-tier capacity for all Melbourne. The map reuses its instance across sign-in and camera changes, and its module worker is bundled into one asset for Safari.

Release verification: 330 unit/domain tests, ten database migration/test pairs, typecheck, lint, production build and Chromium/WebKit desktop/mobile flows pass. Both browsers completed a registered-side form, submitted it to a mocked request endpoint, and exercised the admin approval UI; database tests separately exercise the real transaction and access controls. Vercel production serves commit 46e5a7c and all 3,246 street sides, and Safari production street search is working. Hosted signed-in submission is not yet claimed.

Street search refinement: suggestions now show each street name once, without side or junction entries. Selecting a name centres the map on the full street’s general area and leaves the precise side/section to map selection. The duplicate native suggestion list was removed.

Street-number search accepts addresses with a street number and road name and recentres on the returned address coordinates. Plain road queries retain one suggestion per road. Address queries are sent directly to Photon only after Search/Enter, restricted to metropolitan Melbourne, cached for the browser session, and validated to retain the requested house number. No road midpoint is presented as an exact address. Empty/error results keep street-name search available. Photon uses OSM data and does not guarantee every address or service availability: https://github.com/komoot/photon. Address search does not expand Carnegie parking coverage.

## Multi-suburb coverage — 8 October 2026

The map now offers Carnegie and 13 added suburbs: Chadstone, Bentleigh, Brighton, Malvern, Oakleigh, Clayton, Springvale, Mulgrave, Clayton South, Moorabbin, Hampton, St Kilda and Glen Waverley. Code imports OSM coordinates from the dated Geofabrik Victoria extract, resolves suburb polygons, splits shared junctions and creates two side targets. The resulting registry has 48,034 distinct sides and preserves all 3,246 existing Carnegie features. No parking permissions are inferred.

Each suburb's GeoJSON loads on selection; the map canvas remains mounted. Address and sign-in returns restore the appropriate coverage, and the annotation API uses a trusted full registry. Arrival controls fit desktop and mobile viewports after adding the selector.

Hosted migrations 011–013 are installed, including checked batch registration and exact polygon enforcement for cloud draft coordinates. Hosted audit: 14 areas, 48,034 sides, zero invalid geometries, 16 MB for the street table and indexes, no authenticated importer access. Migration 010 remains unapproved and unapplied. The storage result measures this import, not metropolitan-scale capacity.

Verification: 337 unit/domain tests and both isolated database schema paths passed. Browser checks exercise the added suburbs, a new-suburb annotation submission and the admin UI in Chromium/WebKit with fixture responses. Real-user confirmation, cloud workflow and admin assignment still await email setup and the nominated account. See [street source notes](suburb-street-source.md) and [remaining launch tasks](launch-pending.md).

A live Safari check caught a source-update race during suburb changes: map tile loading made `isStyleLoaded()` false after the one-time load event, so the new overlay could wait forever. Source updates now check source existence directly. Chromium/WebKit checks open a new suburb's grey-street popup on the retained canvas in both mobile and desktop modes.

## Simple contributions and cold map loading (October 2026)

The default form accepts P limits, weekday checkboxes, all-day or timed periods, payment status and optional timed special conditions. No photo, exact transcription or imagery date is required. These inputs are stored as community interpretations, not field observations. Full-section conditions replace overlapping general permission during their hours; small local restrictions retain the general street availability. Saved simple form inputs reopen with their selected days and hours; the detailed editor remains available. Migration 014 accepts community entries and tow-away rules while preserving verified-email eligibility, immutable evidence and admin/five-contributor approval.

The map now reserves its layout space before JavaScript arrives, displays loading status, starts overlays after style readiness rather than waiting for every raster tile, and reuses the already-loaded street data. Cold-browser regression checks deliberately delay JavaScript and background tiles.

Verification for this update: 346 distinct domain/unit checks passed across the full suite and targeted follow-up; production build with lint/type validation passed. Both isolated database schema paths passed through 014. Chromium and WebKit passed simple-form submission, saved day/hour restoration, mobile width and admin review with fixture accounts, plus delayed-JavaScript/delayed-tile cold loading. Hosted 014 was applied successfully and audited for community-entry/tow-away support and unchanged five-contributor quorum. Real account verification/admin assignment and the live approval workflow remain separate launch prerequisites.

Signed-in desktop maps now use MapLibre cooperative gestures: Ctrl/Command + scroll zooms, while unmodified wheel scrolling moves the page and shows the built-in zoom hint. This applies to fine-pointer devices; phones retain ordinary touch and pinch controls. Guests retain the zoom lock and sign-in notice.

Desktop gesture regression checks passed in Chromium and WebKit: an ordinary wheel scroll moved the page without changing the map viewport; both Control + wheel and Meta/Command + wheel reduced the visible map bounds. Mobile checks confirmed cooperative desktop gestures stay disabled.

## Per-rule holiday wording and live admin access

Each simple parking period and special condition now records whether the sign lists weekdays. “No days listed” covers every day and defaults holidays to included; named weekdays, including all seven, default holidays to excluded. Editing days resets the automatic setting for that entry, while an explicit holiday override remains available. Legacy draft holiday choices are retained; unrecorded day wording is flagged for contributor review. General parking that applies on holidays stays intact when a named-day restriction is excluded, with bounded whole-section restriction precedence on ordinary days.

The nominated account was verified and eligible, and was granted admin after explicit confirmation. The live private admin queue was opened successfully with a pending submitted entry. No real annotation was approved automatically.

Checks for this update: 351 domain/unit checks, production build (including lint/types), and Chromium/WebKit desktop/mobile form, draft-restoration and admin-review fixture checks passed. The mixed everyday-permission/weekday-tow-away case is tested on both an ordinary day and Melbourne Cup Day. Live admin role assignment and queue access were verified separately through Safari.

### Admin location and time review

Pending submissions show readable weekday/time periods, a road preview with the submitted side highlighted and A/B boundary markers, plus Google Maps Street View links at the start, midpoint and end. The preview uses server-registered geometry, not contributor-supplied coordinates. Original entry text remains available in a collapsed section. Approval still requires the existing admin review and reason. Side offsets are approximate and Street View coverage/date must be checked.

Admin review notes are optional for approval and rejection. Decisions still require confirmed admin access and create an audit event, including when no note is entered. Migration 015 removes only the note minimum.

The quick parking editor accepts whole-minute limits such as 1 min, 5 min and 10 minutes, alongside P/hour limits. Saved drafts retain the entered wording and generated review text labels minutes correctly.

Malvern East and Oakleigh South join coverage, bringing it to 16 suburbs and 55,346 registered street sides. All 48,034 prior records are preserved. Migration 016 is additive and creates no parking rules or approvals.

Hosted SQL can be applied with `npm run db:apply -- <migration.sql>` (preview) and the explicit `--apply` runner. Connection credentials stay in an ignored local environment file. The runner does not apply optional migrations implicitly and requires a PostgreSQL client and database connection setup.

Successful annotation submission now shows a prominent green “Sent for review” confirmation, brings it into view and focuses it for keyboard/screen-reader users. The simple editor button also changes its label on success. Failures retain their error message and draft.

Zooming beyond the parking-query area limit now shows a prominent notice directly over the map: “Zoom in to view parking rules”. It explains that colours are hidden at that scale and disappears when the view is narrow enough again.

Additional parking periods default to weekdays not selected in earlier parking periods (weekday/weekend complements); fully covered weeks start with no days selected. Existing entries and special conditions retain their selections. Complete, current, verified schedules with ordinary parking rules now show “No signed time limit” for stays wholly outside their signed periods, while active special restrictions and incomplete/unverified schedules retain their existing checks.

Arrival and duration controls open by default. The toolbar also always shows the currently selected arrival and length of stay when the controls are collapsed.

The default visit duration is now 15 minutes in the map, arrival controls and guest evaluation. Users can still choose a different intended stay.

The review-submit button is visibly grey and disabled until the required street-side rules/boundaries confirmation is checked. A red asterisk and required wording identify that checkbox; incomplete drafts can still be saved.

Town-centre guest preview and password update: fixed small public windows with approved schedules only, per-town/per-Melbourne-day caching and an authenticated daily Vercel warmup; short guest panning with sign-in prompts, guest location search disabled, curated hub defaults, signed-in map controls collapsed with the visit summary always visible. Added email password recovery, a fixed allowlisted callback and authenticated password changes. Hosted migration 017 and the private cron credential are separate activation steps; see guest-preview-and-passwords.md.

Contribution points: signed-in eligible contributors see one point per approved submission in the top bar, including existing approvals. Pending/rejected entries earn none. Counts come from the current user’s submissions under existing database policies, not client input or the current publication alone. Totals refresh on page load and window focus. The points button opens an accessible dialog explaining that rewards are planned and nothing is redeemable yet. No migration or approval-policy change was needed.

Mobile review previews: every pending submission now has a north-up SVG outline showing the registered street shape, submitted side and A/B boundaries. It does not need image tiles or WebGL. Interactive maps are optional and the review page permits only one at a time; asynchronous map errors retain the outline and all three Street View links. Existing approval rules and submitted geometry are unchanged.

Street-side selection: unknown streets, recorded rules, paid edges and stay-limit overlays now share zoom-dependent side spacing and line widths. They retain the existing spacing at zoom 16, spread to 44 pixels between side centres at zoom 18, and grow farther apart at higher zoom. This is a visual selection aid; registered geometry and annotation boundaries are unchanged.

## Persistent parking results and Hawthorn

Signed-in viewport refreshes retain the last successful parking results during movement and loading. Requests begin after movement stops and a 250 ms debounce. A map notice identifies the refresh; successful responses replace results together, temporary failures retain them with a Retry message, and denied access clears them. The existing zoom-out threshold still hides detail with a zoom-in notice.

Hawthorn adds 3,924 street-side targets, preserving the previous 55,346. Migrations 018 and 019 add geometry and its Glenferrie-centred guest preview. No parking rules are inferred from road geometry.

While the arrival/duration popup is open, its toolbar sits above MapLibre navigation controls so the arrival/duration popup Close button receives taps on phones. Browser checks verify the button is the hit target and dismisses the popup on mobile and desktop.

Street hover/tap popups show sanitized signed-rule summaries alongside the selected-visit result. Summaries use bold black when a rule applies during any part of the visit and bold grey when it does not. Days, hours, metering and excluded holidays remain visible outside signed hours; unknown applicability is labelled. Local-zone popups carry their own summaries.

The simple editor blocks a parking period completely consumed by whole-section special conditions, identifying the period and how to fix it. Existing partial exceptions still subtract their hours, adjacent periods remain valid, and smaller local zones remain supported. Shared draft validation also rejects raw schedules that permit parking during overlapping whole-section no-stopping, no-parking, clearway or tow-away rules (while retaining the explicit holiday override semantics). Contradictory drafts may be saved but cannot be submitted for approval.
