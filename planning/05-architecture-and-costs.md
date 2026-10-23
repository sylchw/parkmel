# Architecture and operating constraints

## Recommended stack

- Next.js with TypeScript for the web application and server endpoints, deployed to an eligible Vercel Hobby project.
- MapLibre GL JS renders a flat 2D OpenStreetMap-based map. Use a no-cost tile-provider plan, initially MapTiler Free if eligible; a licensed free equivalent can replace it. Keep tile/style configuration and attribution replaceable. No paid map plan or automatic paid upgrade is authorized.
- Supabase Auth for Google and Apple OAuth; PostgreSQL/PostGIS for sections, revisions, spatial queries and ledgers.
- Schema validation shared between forms and server boundaries; server-side validation remains authoritative.
- A small deterministic rules module with reviewed fixtures. No generative model participates in parking eligibility or consensus.

Pin supported package versions during implementation and record them in the lockfile. This plan does not prescribe unverified future version numbers.

## Free 2D map

OpenStreetMap provides data; MapLibre renders it; a tile host delivers tiles. Display linked “© OpenStreetMap contributors” attribution and any required provider credit even with mobile sheets open. Keep the parking database as an independent overlay; OSM roads alone do not establish parking legality. Use a free plan with a hard quota/service stop and a list fallback when exhausted. OSM public standard tiles can support modest policy-compliant interactive use, but have best-effort availability and no bulk/offline prefetch [S20]. Do not bundle downloaded public OSM tiles for offline development. Use a clearly labelled schematic fixture map for offline UI work; configure live tiles only during operator integration.

## Trust boundaries and API design

The browser renders the map and edits drafts. Next.js validates sessions, request shape and eligibility. The database enforces row-level security, constraints and atomic operations. Keep Supabase service-role credentials server-only; prefer scoped user operations and narrowly granted transaction functions. If a privileged service key is used, every handler must perform authorization because it bypasses RLS.

Suggested routes:

| Route | Access and responsibilities |
|---|---|
| `/api/map/bootstrap` | Issue/resume a guest allowance and a random supported preview centre; return public configuration. |
| `/api/map/sections` | Bounded bbox query. Guest fixed-scale public projection while allowance lasts; eligible users receive requested evaluated results. Validate bounds, limits and session. |
| `/api/search` | Eligible users only. Curated precinct/locality search first; licensed geocoding adapter where enabled. Rate-limit requests. |
| `/api/sections/:id` | Public-safe details subject to preview policy; no personal information. |
| `/api/observations` | Eligible users only; canonicalize and transact submission/vote/reward state. |
| `/api/change-reports` | Eligible users only; require complete candidate and evidence metadata. |
| `/api/admin/*` | Admin role checked on every request; immutable audit events. |
| `/api/me/*` | Own preferences, contributions and reward ledger only. |

Apply RLS even if normal UI traffic goes through Next.js. Anonymous direct database requests must not bypass protected search, detailed datasets or mutation rules. Public projections should be explicit views/functions, not unrestricted access to base tables. Protect cookie-authenticated mutations against cross-site requests and verify OAuth redirect/state handling through the supported auth library.

## Guest allowance specification

Both deterrents apply: a persisted cumulative allowance and refresh repositioning. Track active foreground use using elapsed monotonic time with periodic server updates; cap implausible jumps and reconcile on focus/navigation. Background time does not consume allowance. A per-page timer resets on reload, but remaining time is `min(page allowance, persisted cumulative remaining)`.

Use a signed anonymous identifier/cookie with a small server record, plus local state for responsive UI. Do not reset the server allowance when a client deletes only its timer value. Validate guest API entitlement on the server, and stop issuing protected data after expiry. A malicious client can clear identifiers or withhold activity signals; this is a soft sign-in deterrent, not robust identity enforcement. Avoid fingerprinting or broad IP bans. Rate limiting addresses bulk abuse separately.

Disable all guest zoom paths: buttons, pinch, wheel, double tap, keyboard and browser map shortcuts. Browser page zoom for accessibility must still work. Clamp guest queries to preview scale; panning within supported coverage remains allowed. A refreshed guest page selects a random centre from surveyed precincts, never an arbitrary empty coordinate. Sign-in restores the selected section/draft; eligible accounts bypass guest randomness and timeouts. Define the initial persistence as 30 days and disclose it; expiry is a policy reset, not a refresh loophole.

## External Street View links

Street View is an outbound hyperlink, not an integrated service. Generate the documented Maps URL locally from the selected street-section coordinates, with no Google API key, SDK, panorama fetch or billed Street View request. Google hosts the viewer outside ParkMel. Preserve the draft on departure and return, and test browser/app handoff on both mobile platforms. This avoids Google Street View integration charges; the app’s own base-map provider has its separate quota and pricing. See document 02 for the distinct data-reuse policy.

## Authentication prerequisites

Configure Google and Apple with exact local, preview and production callback allowlists. Provider sessions must survive mobile redirect flows. Preserve drafts without placing personal details in OAuth URLs. Reject open redirects. Use verified provider claims, not display-name/email text supplied by clients.

Apple web configuration requires a Services ID linked to an appropriate primary App ID and developer setup [S14]. Supabase's Apple OAuth guide describes client-secret renewal, including the six-month lifecycle [S15]. Document ownership and a renewal reminder; do not confuse the client secret with automatic private-key rotation. A paid developer membership may be needed. Google-only development is permitted as an explicitly incomplete preview; it cannot pass the full two-provider release gate.

## Queries, caches and graceful limits

Use indexed spatial intersection queries, simplify display geometry at appropriate zooms and cap initial responses at 1,000 sections with an explicit truncation/zoom message. Set a measured bbox-area limit, initially 2 square kilometres for detail queries, and adapt coarse overview projections separately. Do not return the entire contribution database to the browser.

Cache public geometry by dataset version. Keep authenticated responses private/no-store unless carefully separated into public projections. Never cache user eligibility, private evidence or reward responses in a shared CDN response. On revision promotion invalidate affected derived results. Expiry and freshness are evaluated on reads; scheduled maintenance is optional, not required for correctness.

Use quota dashboards and a provider-disable flag. If tiles fail, show the accessible results/coverage list. If external geocoding is disabled, retain curated suburb/precinct search. If the database is unavailable, show a clear unavailable state rather than claiming old results are current. Avoid public Nominatim or OSM tile servers as an unbounded production fallback [S19–S20].

## Cost facts and estimates

Checked 5 October 2026; recheck before provisioning. These are product limits, not usage guarantees.

| Dependency | Checked constraint | Consequence |
|---|---|---|
| Vercel Hobby | Intended for personal/noncommercial use; includes bounded compute and transfer [S16]. | Suitable only while the project remains eligible. Advertising/commercial launch requires a fresh plan decision. |
| Supabase Free | Published allowances include 500 MB database, 50,000 MAU, 5 GB egress and 1 GB storage; inactivity pausing and no automatic backups are relevant [S17]. | Keep photos optional/capped, maintain owner-run exports and do not promise production availability. |
| MapTiler Free | Published free allowances include 100,000 API requests; session allowances are separately described. Free use is personal/noncommercial and quota exhaustion can pause service [S18]. | Direct MapLibre integration must be budgeted under the applicable billing mode, not assumed to receive SDK session accounting. |
| Apple developer membership | Published standard membership is USD 99/year or local equivalent, with eligibility exceptions [S14]. | Full zero-new-cost deployment depends on existing membership/eligibility or a revised auth requirement. No purchase is authorized. |

Illustrative pilot budget: 100 monthly users × 10 map openings × 25–50 tile/style requests gives 25,000–50,000 requests before other map operations. This is an estimate to measure on real phones, not a statement of provider billing behaviour. Set warnings at 50%, 75% and 90% of actual applicable quotas; use a manual disable flag before exhaustion rather than automatic upgrades.

For storage, 10,000 section records and 10,000 observations averaging 2 KB each is roughly 40 MB of raw record data; indexes, geometry, history and overhead can multiply that substantially. Measure actual database size during seeding. Do not treat the estimate as capacity proof.

## Operations and privacy

Separate development fixtures from real observations. Keep production secrets in managed environment settings and provide only variable names in `.env.example`. Restrict browser-visible tile keys by origin where supported; they are not private secrets. Do not log auth tokens, full evidence URLs or precise user destinations.

Before public launch, test a private database export and restore, assign an owner to weekly backups and review account/contribution deletion semantics. Retain useful public observations under a disclosed contribution licence with contributor identity removed where appropriate; define exceptions and actual legal obligations before launch. Do not place database dumps in the source repository.
