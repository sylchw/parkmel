# Q45 source and service operator packet

Prepared 7 October 2026. This packet records required checks; no competitor journey, licence approval, field survey or live service test is claimed. Holiday research below was explicitly authorized by the user and is the one updated online evidence item.

## Target coverage gaps

| Area | Council lead | Required coverage evidence |
|---|---|---|
| Carnegie | Glen Eira, sensor/PayStay guidance S01 | One central retail destination and one adjacent street; prove exact on-street sides, full sign schedules, supported arrival/duration and free-price filtering. Exclude mixed off-street sensor records. |
| Caulfield / North / South / East | Glen Eira S02 | Verify each locality polygon, boundary/council intersections and shopping/station precincts. No reusable complete restriction feed is proven. Separate results for each named locality. |
| Murrumbeena | Glen Eira S02 | Station and shopping-strip field survey; side/endpoints, all panels, dates and public-day semantics. |
| Malvern East | Stonnington S03 | Prove suburb-specific sensor/app coverage; council-wide marketing is insufficient. |
| Oakleigh | Monash S04 | Validate current Atherton/Portman/Station/Drummond street-side schedules, feed access rights and geometry extents. |
| Clayton | Monash S04/S05 | Verify Clayton Road/Dunstan Street actual signs; distinguish 2026 consultation proposals from installed controls. Resolve Clayton South/council boundaries. |

## Reproducible live service/forum audit

Test Parkopedia, PayStay, ParkThere, ParkWhere and Pinloco separately; confirm product identity. For each suburb group test a retail destination and adjacent street on available platforms. Save date, platform/version, destination, side/extent, rule text, arrival/date/duration support, price, login requirement, on/off-street status, evidence URL and outcome (pass/fail/unavailable/blocked). Do not infer a market gap from failed search or marketing screenshots.

Find dated firsthand and contradictory accounts on public Melbourne/suburb forums, Reddit and Whirlpool. Record link/date/product/area and distinguish suggestions from actual use. Forum evidence establishes reported experience, never sign legality or complete coverage. No messages or council emails have been sent.

## Rights/source register closure

For each source capture owner, exact URL, retrieved/version date, licence text/version, intended allowed uses, attribution, refresh policy, restrictions and explicit approval status. Keep unknown/rejected sources out of imports.

- **Independent field records:** complete panel text/arrows, both endpoints/side, markings, observation/submission dates, original evidence rights and privacy review. Label invented fixtures separately.
- **Council datasets/APIs:** obtain applicable reuse licence and access limits, trial one bounded on-street query, prove fields/sign semantics/current effective date, exclude carparks, and retain source version. Sensor access is separate from rule coverage.
- **Vicmap boundaries (S06):** verify CC BY metadata and service terms; prove one locality query, CRS/WGS84 transform, pagination/max-record behaviour, valid extents/IDs and attribution before bulk import. Precinct survey zones need explicit owner review.
- **Road/kerb source:** independent licensed geometry; road centreline is not signed street-side extent. Record version and approval separately from locality licence.
- **OSM (S07/S20):** review ODbL/derived-database obligations and linked attribution. No bulk public-tile download or unrestricted production fallback. A separate table is not a licence exemption.
- **Google (S08–S10):** external coordinate hyperlinks are separate from imagery transcription rights. No panorama download, OCR, scraping or image crops. Imagery-derived database collection stays blocked until applicable terms/permission explicitly allow the proposed use. Record old image dates separately if approved later.
- **Tile/service plans (S16–S20):** recheck noncommercial/free-plan eligibility, permitted hosting use, quotas/billing mode, attribution, hard stop and accessible fallback. No automatic paid upgrade or spending is authorized by this packet.

## Holiday fixture evidence updated 7 October 2026

See [holiday-review.md](holiday-review.md). Current Road Safety Road Rules version 026 rule 318 and Victoria Legal Aid guidance were read online, with the Business Victoria 2026 calendar. Q07 implements explicitly interpreted named-day/no-day/holiday override semantics and 14 metropolitan Melbourne dates. Regional alternatives, later years, school/event-day semantics and unsupported exceptions remain unknown. Calendar data may change; refresh before later operation. This is a source-backed implementation review, not field-sign certification.

## Exact source leads

S01: https://www.gleneira.vic.gov.au/services/parking/parking-sensors-and-paystay-app
S02: https://www.gleneira.vic.gov.au/services/parking
S03: https://www.stonnington.vic.gov.au/Services/Parking/Parking-sensors
S04: https://www.monash.vic.gov.au/Parking-Streets-Footpaths/Parking/Parking-Fines/In-ground-parking-sensors
S05: https://www.monash.vic.gov.au/About-Us/News/2026/A-new-plan-for-parking-in-Clayton
S06: https://discover.data.vic.gov.au/dataset/vicmap-admin-rest-api
S06 query lead: https://services-ap1.arcgis.com/P744lA0wf4LlBZ84/arcgis/rest/services/Vicmap_Admin/FeatureServer
S07: https://www.openstreetmap.org/copyright
S08: https://www.google.com/help/terms_maps/
S09: https://developers.google.com/maps/terms
S10: https://developers.google.com/maps/documentation/urls/get-started
S11: https://www.legislation.vic.gov.au/in-force/statutory-rules/road-safety-road-rules-2017/026
S11 guidance: https://www.legalaid.vic.gov.au/parking-laws-fines
S12: https://business.vic.gov.au/business-information/public-holidays/victorian-public-holidays-2026
S16: https://vercel.com/docs/plans/hobby
S17: https://supabase.com/pricing
S18: https://www.maptiler.com/cloud/pricing/
S19: https://operations.osmfoundation.org/policies/nominatim/
S20: https://operations.osmfoundation.org/policies/tiles/

## Return evidence

Save results/source approvals under state/operator with version/date and remaining gaps. Supply an approved local boundary file plus field records for Q38/Q39, a local PostGIS test runtime for Q10–Q13, installed browser runtimes for Q21/Q43, and supported real provider setup for Q15. This completed packet does not close the online/field release gates.
