# APP03: street information popups

status: pass
scope: mobile tap and desktop hover street popups, grey contribution/Street View links, selected-location return and specific zone labels
router: app
framework_evidence: installed Next.js 15.5.27, React 19 and MapLibre 6.12.0 Popup/setDOMContent/event declarations; existing dynamic map and external Street View URL helper
boundaries: React portal renders escaped text into a MapLibre-owned popup node. The server continues deriving sanitised display metadata from applied rules. Sign-in, eligibility, RLS and publication authority are unchanged. Contribution links retain bounded map coordinates; Google Maps opens only when the user follows the external hyperlink.
changed: src/components/map/StreetPopupContent.tsx; StreetMap.tsx; map.css; PilotApp.tsx; src/lib/map/parking-display.ts; tests and implementation summary
verified: npm run lint; npm run typecheck; npm test (39 domain + 277 unit); npm run test:e2e (production build and Chromium/WebKit mobile taps and desktop hover, focus retention, Escape, direct contribution and coloured-rule details); git diff --check
not_run: Street View image availability or real device app handoff; account signup; admin publication
handoffs: none for this bounded UI/read change
findings: none
residual_risks: custom SMTP and submission/review/publication remain unconnected. Browser fixtures are invented and are not production parking evidence. Public production grey geometry was confirmed available (897 ways); deployment of this popup commit requires the Vercel main build.
