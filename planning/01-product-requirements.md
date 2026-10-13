# Product requirements

## Scope and language

Use “free for your selected stay,” “time limited,” “restricted,” “unknown,” and “change reported.” Avoid “available spot” unless actual occupancy data is separately licensed and integrated. The prototype does not predict occupancy.

Only on-street kerb sections belong in results. Exclude shopping-centre carparks, garages, private parking, off-street council lots and other parking complexes, even when a source mixes them with street bays. A shopping centre can be a destination and survey-priority anchor.

## Requirements register

| ID | Requirement and acceptance boundary |
|---|---|
| R01 | Support the six named suburb groups and explicit locality boundaries. Never substitute nearby off-street results when street data is missing. |
| R02 | Display street-side sections, category legend and five distinguishable confidence shades. Unknown and unannotated areas have their own neutral appearance. Colour is never the only indicator. |
| R03 | Eligible signed-in users can search destinations and filter for free parking using arrival date, local time and intended duration. Evaluate the complete stay. |
| R04 | Offer weekday, Saturday, Sunday and public-holiday selection. An actual date remains the authoritative input for holiday and daylight-saving evaluation; weekday shortcuts select and display a concrete date. |
| R05 | Show ordinary free parking, time-limited free parking, paid periods, permit conditions, accessible spaces, loading zones, no-parking/no-stopping, clearways and conditional/event rules. “Include all” means represent all categories; it does not make special-use spaces eligible for ordinary motorists. |
| R06 | Guest and unverified-account previews permit pan and section inspection, but no search, filters, zoom or contributions. Enforce protected operations on the server. |
| R07 | After 120 cumulative active seconds, blur and disable the guest map and present accessible sign-in. Refresh resets only the page timer and moves the initial guest viewport within supported coverage; persisted allowance still governs. |
| R08 | Provide working Google and Apple sign-in. A verified email credential or trusted provider assertion establishes eligibility; merely having an account does not. Do not require Apple private-relay users to disclose another email. |
| R09 | Eligible users can add a complete section annotation, confirm one, or propose a change. Admins can verify, reject, correct, merge or split sections with an audit reason. |
| R10 | Initial annotations appear immediately in a lighter unverified state after structural validation and abuse checks. Five distinct eligible contributors agreeing on the complete canonical revision, or an admin, verifies it. |
| R11 | Continue accepting confirmations after verification. Confidence has five levels and cannot grow beyond the darkest shade; evidence and recency can still improve. |
| R12 | Three matching eligible change reports in a rolling seven-day window produce “change reported.” Replacement uses the process in document 04; history remains available. |
| R13 | Record source type, observation date, submission date, contributor and any source/imagery date separately. Do not present old imagery as a current observation. |
| R14 | Prioritize commercial/activity-centre coverage and useful corrections. Maintain accepted-point records and configurable future ad-free entitlements, with prototype ads disabled. |
| R15 | Core search, inspection, annotation and sign-in work on mobile Safari and Android Chrome. No essential hover interactions, tiny map-only controls or desktop-only moderation assumptions. |
| R16 | Run the eligible noncommercial prototype within agreed free-tier limits. Document external prerequisites, quotas and graceful failure instead of silently enabling billing. |
| R17 | Unknown, stale, disputed, unsupported or incomplete schedules must not enter the default “free for my stay” results. Users may explicitly inspect these categories separately. |
| R18 | Preserve revision history, moderation decisions and reward adjustments. Make consent, account deletion and contribution-retention policies understandable. |

## 2D base-map requirement

Use OpenStreetMap-based tiles or an equivalent licensed free option. Render a flat 2D view with MapLibre and parking overlays; disable terrain/3D/pitch features. Keep street labels and required attribution visible on phones. Use a free provider plan without automatic paid overages. Street View remains an external hyperlink.

## Main journeys

### Find parking

An eligible user searches a destination or chooses their location, enters arrival and duration, and selects free parking. Display qualifying sections with an explanation such as “Free, maximum 2 hours, your stay 45 minutes.” Selecting a section opens a mobile bottom sheet with street side, endpoints, rules, effective periods, confidence, last observed date and walking context. A route link navigates toward the section, not an allegedly empty bay. Geolocation is optional and requested only when the user selects it.

Do not ask guests for a destination they cannot search. Their preview starts at a surveyed activity centre, at a fixed useful zoom. Before expiry, a clear sign-in call to action explains the unlocked controls. At expiry, remove map interaction, move focus to the sign-in panel and avoid trapping keyboard or screen-reader users behind the blur. Keep a short explanation and accessible noninteractive coverage summary available.

### Contribute

Select a street side and start/end boundaries; inspect existing revisions; choose source and observation date; enter every applicable sign panel and exception; preview the interpreted schedule; then submit. Require a deliberate “all visible panels and relevant boundaries checked” declaration. A checkbox alone is not proof of legal completeness. Let users save incomplete drafts without publishing them as free parking.

Provide an “Open Street View” coordinate-based external hyperlink. Open a separate browser tab or the Google Maps app where the device handles the link that way; preserve the annotation draft for the return journey. Do not embed Street View or call Google imagery APIs. Implementing this link does not depend on approving imagery-derived data collection. If transcription rights have not been cleared, explain that the public contribution workflow accepts independent field observations and approved sources. Do not invite users to bypass this distinction.

### Report changed signs

Show the current schedule and let the user submit a complete replacement plus evidence, rather than an ambiguous downvote. Explain whether the submission is pending, has triggered a change warning, or has been accepted. Keep the previous published rule visible with its warning until resolution; omit the disputed section from default recommendations.

## Mobile and accessibility acceptance

- At 360 CSS-pixel width, primary controls and forms work without horizontal scrolling.
- Map gestures do not prevent scrolling the annotation sheet. Controls accommodate touch, keyboard and screen readers.
- Show a list alternative for the current map results and retain selected-section state when changing views.
- Confidence shades are supplemented with labels such as “Community verified · level 3/5.” Light lines retain visible outlines and adequate contrast.
- Handle slow networks, location refusal, empty coverage, exhausted provider quotas and failed OAuth without losing draft work.
- Keep the original destination and draft across sign-in. Never randomize the viewport of an authenticated eligible user.

## Explicit exclusions

No reservations, guaranteed availability, turn-by-turn navigation, automated Street View extraction, advertisement SDKs, native mobile apps, paid subscriptions or unrestricted citywide launch in the first release. These do not prevent later expansion through separate decisions.
