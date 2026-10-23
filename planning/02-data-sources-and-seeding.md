# Data sources, competitor checks and initial coverage


## Evidence status

Checked 5 October 2026. “Documented” means an official page describes the capability. It does not mean a live app journey or reusable API has been tested. “Not found” describes this investigation, not proof that a dataset does not exist. Source references resolve in document 08.

| Area | Council/source lead | Established evidence | Still required |
|---|---|---|---|
| Carnegie | Glen Eira | Council describes selected activity-centre sensors and PayStay, including a mix of street bays and carparks [S01]. | Inspect exact street coverage, rules search and free-duration filtering; obtain feed rights if offered. |
| Caulfield, North, South, East | Glen Eira | Council parking guidance exists [S02]. No complete reusable restriction feed established. | Boundary checks, activity-centre survey and council dataset enquiry draft. |
| Murrumbeena | Glen Eira | Same council guidance; no complete reusable restriction feed established. | Station/shopping-strip street survey. |
| Malvern East | Stonnington | Council describes sensor parking and PayStay across selected locations [S03]. | Prove Malvern East coverage specifically; do not infer it from council-wide marketing. |
| Oakleigh | Monash | Council identifies on-street sensor locations including parts of Atherton, Portman, Station and Drummond streets [S04]. | Current sign schedules, API access and exact street-side extents. |
| Clayton | Monash | Council identifies Clayton Road and Dunstan Street sensors [S04]; a 2026 parking-plan consultation exists [S05]. | Distinguish proposals from installed rules and survey current signs. |

Street names identify survey leads, not verified free-parking recommendations. Validate locality and council boundaries, especially near Clayton South and Chadstone. Do not ingest every sensor location from mixed on/off-street inventories.

## Reproducible service and forum audit

An initial forum search found Melbourne discussions of confusing sign combinations and recommendations for Parkopedia, alongside an anecdotal recommendation for ParkThere particularly in the CBD. These support the existence of user friction and competing tools, not the absence of suburban coverage [S23]. Shortlist Parkopedia, PayStay, ParkThere, ParkWhere and Pinloco for direct testing; the last two also appeared in current search results. Do not conflate similarly named products or treat an app-store description as a successful test. No firsthand forum report located in this pass established complete working coverage of all six target suburb groups.

Before finalizing a market-gap claim, test PayStay and any candidate found through searches for Melbourne on-street restrictions, free parking and suburb-specific parking apps. For every named suburb group, use one central retail destination and one adjacent street. Record the test date, platform, destination, street-side coverage, displayed sign rules, arrival/duration support, price, login requirement and whether the result is on-street. Mark blocked or unavailable journeys honestly. Do not treat a business listing or marketing screenshot as a working service.

Search public Melbourne/suburb forums, Reddit and Whirlpool for experiences using each identified product, plus discussions of parking-sign discovery in the target suburbs. Record thread dates and links, distinguish firsthand usage from suggestions, and seek contradictory reports. Forum comments can establish user friction or reported limitations; they cannot establish current parking legality or complete service coverage. This audit is a remaining research work package, not a claim of validation already completed by this document.

The app may still be useful if a competitor covers some streets: assess breadth of restrictions, full-stay free filtering, provenance and contribution usability before positioning it.

## Source policy

| Source | Intended use | Decision |
|---|---|---|
| Independent on-site observations | Sign text, boundaries, relevant markings and observation date | Preferred seed source. Contributors must have rights to submitted photos and avoid identifying bystanders or vehicle plates. |
| Council open data/API | Restriction schedules and geometry where licensed | Use only after checking licence, dates, field semantics, street-only classification and operational limits. |
| Vicmap Admin REST API | Locality and local-government boundaries | Official metadata advertises CC BY 4.0. Service directory was accessible; layer/query validation and attribution remain implementation tasks [S06]. |
| Road/kerb geometry | Draw sections independently of Google | Select a licensed road source or create geometry from independent observations. A centreline is not an authoritative kerb or restriction boundary. |
| OpenStreetMap | Preferred 2D base-map content; candidate roads/POIs | Respect ODbL/attribution and evaluate derived-database obligations. Keeping tables separate is not by itself a licensing exemption [S07]. |
| Google Maps/Street View | Confirmed external hyperlink; possible manual transcription assessed separately | Transcription remains blocked pending an explicit applicable-terms assessment or permission. API and end-user terms restrict certain derived uses; manual collection is not assumed exempt [S08–S10]. |
| Sensor feeds | Possible future occupancy information | Sensor existence does not establish public access or reuse rights. Not needed for the first rules-based product. |

Maintain a source register with owner, URL, licence text/version, retrieval date, allowed uses, attribution, refresh policy and approval status. Do not import data with unknown rights. API keys and billing setup require owner action; never assume that public documentation grants access.

### Street View external-link requirement

Construct links from independently sourced coordinates:

`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=LAT,LNG&heading=DEGREES&pitch=0&fov=80`

This link format requires no Google API key [S10]. Generate it locally using URL/URLSearchParams from the selected section coordinates; no Google lookup, SDK, embedded viewer or billable Street View API request is needed. Use a standard external anchor with `target="_blank"` and `rel="noopener noreferrer"`; mobile devices may hand it to Google Maps instead. Save the draft before leaving and restore it on return. The link itself is in scope now; imagery-derived database collection remains a separate source-policy question. The nearest panorama may face the wrong side or miss a sign. Opening a link grants no right to copy image content into a new database. Do not download panoramas, scrape imagery dates, run OCR or store Google image crops. If derived transcription is cleared later, record imagery date separately and label it as imagery-derived; otherwise retain field collection as the functioning default.

## Geographic seeding process

1. Load and validate locality polygons; store source versions and attribution. The discovered ArcGIS service exposes locality layers, uses Web Mercator and advertises a maximum record count of 2,000. Request/transform WGS84 deliberately, paginate where necessary and prove one target-locality query before a bulk import.
2. Define activity-centre polygons from an approved source or an explicit owner-reviewed manual boundary. Label them as product survey zones, not statutory planning boundaries unless sourced as such.
3. Prioritize Carnegie's Koornang Road precinct first, then Murrumbeena station/shops, Caulfield station and the Caulfield shopping strips, Malvern East shopping strips, Oakleigh centre and Clayton Road centre. Exact survey polygons need map/field validation.
4. Survey both sides and divide sections whenever signs, arrows, intersections, markings or restrictions change. Include prohibited and paid sections so the map does not imply unrecorded streets are free.
5. Publish unverified but structurally complete observations with provenance. Have an admin check initial launch data against current independent evidence.
6. Run automated eligibility checks and manually compare the map to field observations before labelling a precinct covered.

Proposed seed target: first 30 complete Carnegie sections, then at least 20 sections per included locality, approximately 180–300 sections overall. These are workload targets, not promised coverage. Record a denominator of all street-side sections in each survey polygon and aim for at least 80% complete surveyed coverage before advertising that precinct as covered. Always display gaps. Do not invent observations to meet a quota.

## Import contract

Every import uses a dry-run report: source identity, rights status, rows inspected, accepted/rejected counts, bounding box, duplicate candidates, coordinate reference system, off-street exclusions and schedule-parse failures. Preserve source IDs and source timestamps. Imports create revisions rather than silently overwriting community data. A changed source record enters review when it conflicts with current evidence.

No council emails or data requests are sent as part of planning. Prepare a request asking for machine-readable on-street restrictions, sign locations/arrows, effective dates, licence and refresh cadence if no suitable dataset is found.
