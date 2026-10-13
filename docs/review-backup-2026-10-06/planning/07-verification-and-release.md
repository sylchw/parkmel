# Verification and release gates

All tests below are **planned, not run**. Planning-source checks are not application tests. Assign named owners and attach results during implementation.

## Test catalogue

| ID | Test and important counterexample | Method / evidence |
|---|---|---|
| V01 | Geometry stays in supported localities; opposite sides retain independent rules; mixed off-street rows are rejected; split sections do not inherit votes automatically. | Database/import fixtures plus inspection of an actual boundary query. |
| V02 | A 45-minute stay under a simple verified two-hour free rule qualifies; a three-hour stay does not. Missing fee is unknown, not zero. | Pure domain tests with independently reviewed expected outputs. |
| V03 | A stay crossing into a paid period, clearway or permit period never appears in free results. Departure exactly at a transition uses documented half-open semantics. | Boundary fixtures and property test that a known prohibited subinterval cannot yield eligible-free. |
| V04 | Weekday, Saturday, Sunday and public holiday are distinct. Test named-day versus no-day signs and explicit holiday exceptions. | Fixtures reviewed against current Victorian guidance; include an actual sourced Victorian holiday date. |
| V05 | Overnight rules, midnight, year changes and daylight-saving missing/repeated times are handled without silent shifts. | Time-zone tests with explicit instants and user-input ambiguity tests. |
| V06 | Unknown event calendars, incomplete panels, stale evidence, unsupported time-limit carryover and competing rules cannot yield default free recommendations. | Negative domain tests and explanation assertions. |
| V07 | Guest cannot search/filter/zoom through UI or direct endpoints; accessibility page zoom still works. Unverified accounts receive the same restrictions. | Browser tests plus raw HTTP and direct database requests. |
| V08 | 120 active seconds exhausts allowance; background time pauses; refresh changes centre but cannot restore allowance; local timer tampering does not change server state. | Controlled-clock integration tests and real-browser refresh/navigation checks. Document identifier-clearing limitation. |
| V09 | Google and Apple sign-in work on actual mobile browsers, including cancellation, expired sessions, relay email and safe return to draft. Wrong callback/open redirect fails. | Live provider/device evidence; mocks do not satisfy this gate. |
| V10 | Hue, confidence and freshness are distinguishable without colour alone; empty/partial coverage is explicit; selected stay persists. | Accessibility inspection, keyboard/screen-reader smoke test and mobile screenshots. |
| V11 | Five distinct matching users verify; five requests from one user do not; equivalent canonical schedules match; different sign periods do not. | Database/integration tests with adversarial input and schema-version cases. |
| V12 | Three changes within 168 hours flag; five can promote; two competing threshold candidates require review; an old-image majority cannot replace newer evidence automatically. | Controlled-time tests, concurrent fifth-vote transactions and retry/idempotency tests. |
| V13 | Non-admins cannot moderate or alter roles. Public projections reveal no personal email, provider IDs, private evidence or audit-only notes. | RLS/API authorization tests across all four role states; cache isolation tests. |
| V14 | Add/confirm/change workflows work at 360-pixel width, in iPhone Safari and Android Chrome, including slow network and draft recovery. | Real devices preferred; record browser/OS. Emulation alone is incomplete evidence. |
| V15 | Tile/geocoder quota exhaustion preserves useful list/curated search; oversized bboxes are bounded; database outage is clearly reported. | Failure injection and measured representative map requests. |
| V16 | Points remain pending until acceptance; self-confirmation and retries cannot duplicate points; reversals preserve history; future redemption is atomic and disabled in prototype. | Ledger database tests, simultaneous requests and feature-flag checks. |
| V17 | Published pilot sections match current independently gathered signs, endpoints and relevant markings. Proposed council changes are not mistaken for installed rules. | Field checklist with observer/date/source and independent moderator review. |
| V18 | Export/restore reproduces revisions and ledger; restoring an old revision updates public projections without deleting history. | Isolated restore rehearsal and documented recovery steps. |
| V19 | Actual pilot load stays under configured limits; no secrets or exact destinations appear in logs or built client assets. | Build inspection, representative requests, dashboard readings and log review. |

Use property tests only where they express a real invariant; do not duplicate implementation branches as “proof.” Avoid brittle pixel snapshots for every reversible UI change. Concentrate automation on legal eligibility, authorization, consensus and transaction integrity.

## External-link acceptance check

Verify that “Open Street View” produces a correctly encoded coordinate URL and opens externally on desktop, iPhone and Android, with and without the Google Maps app installed where test devices permit. Confirm the annotation draft survives the return journey. Inspect the application network/build configuration: this feature must not load a Google Maps SDK, request panorama imagery, require a Google Maps API key or enable a billed Street View API. Missing nearby imagery must not prevent manual annotation from an approved source.

## Offline proof boundaries and map acceptance

Qwen may run only checks available locally. If dependencies, a local database or a browser driver are missing, record not-run and the precise prerequisite. Never turn skipped or mocked checks into passes. Test invented schematic geometry rather than downloading tile archives. The operator verifies live OSM-based tiles, visible mobile attribution, no paid overages, real OAuth, quota behaviour and field accuracy. The completed offline implementation is a candidate, not a public-release approval.

## Release checklist

- [ ] Source rights and attributions approved; blocked sources absent from imports.
- [ ] Public copy distinguishes a usable street section from live bay availability.
- [ ] Current supported parking-rule fixtures reviewed, and unsupported cases remain unknown.
- [ ] Google and Apple real-provider tests passed, or the release is explicitly limited to an incomplete private preview.
- [ ] Guest limits and server authorization pass, including direct database access checks.
- [ ] Pilot precinct meets the documented survey standard; gaps remain visible.
- [ ] Conflicting/stale data cannot enter default free recommendations.
- [ ] Mobile and accessibility checks pass on named browser/device configurations.
- [ ] Backup restore, quota handling and moderation ownership are demonstrated.
- [ ] Noncommercial free-tier eligibility and all external prerequisites reconfirmed.
- [ ] Prototype has no ad SDK and makes no unsupported redemption promises.
- [ ] Owner reviews the concrete candidate and any remaining limitations before public deployment.

## Operations and rollback

Provide flags to stop submissions, disable an external provider, hide a suspect imported dataset and suspend free recommendations for an affected precinct. Prefer withdrawing uncertain recommendations over leaving them apparently valid. A bad deployment can roll back the web build; a bad data change needs an audited revision rollback and cache invalidation. Do not assume application rollback reverses database migrations or ledger events.

Use backward-compatible migrations where practical. Before destructive migrations, require a recoverable backup and an explicit reviewed migration plan. Restore only in an isolated environment first. Do not overwrite newer legitimate observations while recovering an older dataset.

Assign the owner/moderator responsibility for change-report review and overdue evidence. Evaluate freshness on requests so correctness does not depend on a successful scheduled job. Track aggregate rule-evaluation failures, unresolved disputes, source age, quota use and auth failures without precise user-location analytics.

## Planning validation performed

This package is intended for human review and implementation handoff. It does not claim conformance with a machine-readable planning schema. The final planning pass checks Markdown file existence, internal links, requirement/test references and consistency of thresholds. It cannot verify application behaviour because no application was built in this task.
