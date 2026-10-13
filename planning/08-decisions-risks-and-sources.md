# Decisions, risks and source register

## Decision and risk register

| Item | Decision or unresolved dependency | Owner / closure evidence |
|---|---|---|
| Geography | Start in the six named suburb groups. Wider Caulfield locality coverage is a stated proposed interpretation; store boundaries rather than relying on postal labels. | Product owner; reviewed locality configuration. |
| Guest deterrence | Apply both cumulative active allowance and refresh repositioning. Proposed reset after 30 days; soft control, not identity proof. | Product owner + engineer; V07–V08 and clear disclosure. |
| 2D map | User selected OpenStreetMap or a free equivalent. MapLibre renders a flat view using a no-cost tile plan; no automatic paid upgrade. | Engineer/operator; live attribution and quota checks. |
| Offline implementation | Qwen has a 16k total context; run one bounded card per fresh session with locally supplied dependencies. | Operator; documents 09–10 and per-card handoffs. |
| Street View access | Confirmed external hyperlink only; no embedded viewer, Google SDK or billable Street View API request. Preserve mobile draft state. | Engineer; external-link acceptance check in document 07. |
| Source rights | Google transcription is not assumed permissible. Use field observations/licensed data until rights are established. | Owner; documented applicable terms/permission and approved source register. |
| Data gap | Complete reusable target-suburb restriction feeds have not been established. Absence is not proven. | Researcher; documented API trials or council response. |
| Existing services | Official pages establish selected sensor services, not full app usability or feature coverage. | Researcher; T01 live service/forum audit. |
| Sign interpretation | Complex transitions, events and incomplete signs are unsafe to infer. | Rules reviewer; sourced fixtures or explicit unsupported status. |
| Community manipulation | Five accounts are not necessarily five humans; accounts may coordinate or repeatedly inspect one image. | Moderator + engineer; provenance/freshness controls, rate limits and V11–V12. |
| Changed signs | Warnings latch until resolved; old popularity cannot block new verified rules. | Engineer + moderator; transactional tests and operating process. |
| Apple | Provider setup and possible developer membership cost remain external prerequisites. | Account owner; real mobile OAuth evidence and renewal owner. |
| Free hosting | Free-tier use depends on eligibility, request volume and service availability. Ads require reassessment. | Owner; current plan terms and measured pilot usage. |
| Incentives | Proposed 20 points/72 hours, priority-weighted. Prototype redemption is off and not promised. | Product owner; future commercial decision before activation. |
| Seed data | A map without complete observations is not meaningful free-parking coverage. | Data steward; field evidence and survey denominator. |
| Privacy | Public contribution history and account deletion need a clear policy; evidence may contain personal information. | Owner; reviewed policy, private storage and deletion tests. |

No additional user approval is needed to finish these planning documents. External spending, provider credentials, unresolved rights and field collection are implementation dependencies, not reasons to fabricate certainty or stop unrelated local work.

## Sources

Checked 5 October 2026. Official pages are primary sources for their own services or guidance. They do not establish every proposed feature or grant rights beyond their stated terms. Quotes are avoided; notes are deliberately narrow.

| ID | Source | What it supports / limit |
|---|---|---|
| S01 | [Glen Eira: parking sensors and PayStay](https://www.gleneira.vic.gov.au/services/parking/parking-sensors-and-paystay-app) | Selected Carnegie sensor/PayStay offering; not comprehensive regional API coverage. |
| S02 | [Glen Eira: parking](https://www.gleneira.vic.gov.au/services/parking) | Council parking information and relevant service entry points. |
| S03 | [Stonnington: parking sensors](https://www.stonnington.vic.gov.au/Services/Parking/Parking-sensors) | Council sensor/PayStay information; specific Malvern East coverage still needs proof. |
| S04 | [Monash: in-ground parking sensors](https://www.monash.vic.gov.au/Parking-Streets-Footpaths/Parking/Parking-Fines/In-ground-parking-sensors) | Sensor-location information includes on-street Oakleigh/Clayton locations and other parking types. |
| S05 | [Monash: a new plan for parking in Clayton](https://www.monash.vic.gov.au/About-Us/News/2026/A-new-plan-for-parking-in-Clayton) | August 2026 consultation; proposals must not be interpreted as current installed signs. |
| S06 | [Vicmap Admin REST API metadata](https://discover.data.vic.gov.au/dataset/vicmap-admin-rest-api) and [ArcGIS service directory](https://services-ap1.arcgis.com/P744lA0wf4LlBZ84/arcgis/rest/services/Vicmap_Admin/FeatureServer) | Boundary dataset/licence metadata and accessible layer directory. Feature-query/import testing remains outstanding. |
| S07 | [OpenStreetMap copyright and licence](https://www.openstreetmap.org/copyright) | ODbL and attribution obligations; review actual derived use. |
| S08 | [Google Maps end-user additional terms](https://www.google.com/help/terms_maps/) | Restrictions relevant to creating/augmenting mapping datasets. Applicability needs review for the proposed workflow. |
| S09 | [Google Maps Platform terms](https://developers.google.com/maps/terms) | Platform restrictions on extraction, content creation and some non-Google-map use. Do not conflate platform and end-user contracts. |
| S10 | [Google Maps URLs guide](https://developers.google.com/maps/documentation/urls/get-started) | Documented Street View URL parameters; no implied right to derive a dataset. |
| S11 | [Victoria Legal Aid: parking laws and fines](https://www.legalaid.vic.gov.au/parking-laws-fines), [Victorian parking guidance](https://transport.vic.gov.au/road-and-active-transport/road-rules-and-safety/parking), and [Road Safety Road Rules 2017](https://www.legislation.vic.gov.au/in-force/statutory-rules/road-safety-road-rules-2017) | Parking and sign guidance plus current legislation entry point. Rule-engine edge cases still need reviewed fixtures. |
| S12 | [Victorian public holidays 2026](https://business.vic.gov.au/business-information/public-holidays/victorian-public-holidays-2026) | Date-specific holiday fixture source; future years need refreshed data. |
| S13 | [Supabase Google OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google) | Provider setup instructions, not evidence of configured project credentials. |
| S14 | [Apple web sign-in configuration](https://developer.apple.com/help/account/capabilities/configure-sign-in-with-apple-for-the-web/) and [membership comparison](https://developer.apple.com/support/compare-memberships/) | Services ID/App ID prerequisites and published membership pricing. Do not infer that an App Store release is necessarily required. |
| S15 | [Supabase Apple OAuth](https://supabase.com/docs/guides/auth/social-login/auth-apple) | OAuth setup and client-secret maintenance. |
| S16 | [Vercel Hobby plan](https://vercel.com/docs/plans/hobby) | Eligibility and bounded included resources; recheck at provisioning and monetization. |
| S17 | [Supabase pricing](https://supabase.com/pricing) | Free-plan quotas, pausing and backup limitations; not an uptime guarantee. |
| S18 | [MapTiler pricing](https://www.maptiler.com/cloud/pricing/) and [sessions versus requests](https://docs.maptiler.com/guides/account/sessions-vs-requests/) | Plan limits and billing-mode distinctions; measure the chosen integration. |
| S19 | [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/) | Public service limits; not an unrestricted production geocoding backend. |
| S20 | [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/) | Public tile-service constraints; not a substitute for a production-provider agreement. |
| S21 | [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security) and [PostGIS](https://supabase.com/docs/guides/database/extensions/postgis) | Proposed database security and spatial capabilities. |
| S22 | [Next.js installation](https://nextjs.org/docs/app/getting-started/installation) and [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/) | Proposed application/map stack documentation. |
| S23 | [Melbourne parking-sign design discussion](https://www.reddit.com/r/melbourne/comments/ysrdur), [parking advice discussion](https://www.reddit.com/r/melbourne/comments/1ah11y8), and [Saturday sign question](https://www.reddit.com/r/melbourne/comments/1umvv8a/can_i_park_here_on_a_saturday/) | Initial forum-search evidence of confusion and anecdotal app recommendations. Threads span multiple years; no comprehensive target-suburb validation is established. |

## Handoff status

- Requirements, proposed architecture, data policy, task ordering and verification strategy are documented.
- Live application testing, field verification, provider configuration, complete competitor/forum validation and source-rights closure remain outstanding.
- The original planning task created no application code or cloud resources. Subsequent local implementation/review is recorded in state; no deployment is implied.
- The planning method used the local [meticulous-planning skill](/Users/sylvester/.codex/skills/demesne/planning/meticulous-planning/SKILL.md), adapted to a human-readable Markdown handoff. No strict machine-schema validation or executed test results are claimed.
