# APP02: Carnegie street coverage and parking colours

status: pass
scope: map display categories, public evaluated display summaries, grey OSM road baseline, annotation access links and admin setup documentation
router: app
framework_evidence: package.json and installed Next.js 15.5.27 / MapLibre 6.12.0 declarations; existing route handlers and dynamic map component
boundaries: server derives only public duration/payment/category metadata from evaluator-applied rules; client displays and filters it. Private IDs/evidence remain omitted. No auth or persistence policies changed. Baseline geometry is a public static ODbL snapshot and contains no parking observations.
changed: src/lib/map/parking-display.ts; src/lib/server/sections.ts; map/pilot components; globals.css; public/carnegie-streets.geojson; tests and docs
verified: npm run typecheck; npm run lint; npm test (39 domain + 270 unit); npm run test:e2e (production build, Chromium and WebKit); git diff --check
not_run: hosted email signup, admin publication and field verification; approval endpoints and production parking records are unavailable
handoffs: none for the bounded presentation/data-read update
findings: none
residual_risks: custom SMTP remains unconfigured; submission/independent confirmation/admin publication still need integration; source geometry describes a survey rectangle and road centrelines, not statutory suburb boundaries or approved street-side sections. Deployment is triggered by the main push but not confirmed by the local build.

Sources: docs/parking-map-colours.md and docs/carnegie-street-source.md. Admin account designation and current approval limits: docs/admin-approval.md.
