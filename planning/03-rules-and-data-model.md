# Parking rules and data model

## Design references

D01: versioned street-side geometry. D02: deterministic schedule evaluation. D03: immutable observations and revision consensus. D04: authorization and privacy. D05: atomic reward ledger. D06: guest allowance. These references connect implementation work to this design.

## Core records

Use PostgreSQL with PostGIS. Generate migrations and constraints before application mutations. Use UUID identifiers, UTC timestamps for events, and `Australia/Melbourne` for evaluating local signs.

| Record | Required content and constraints |
|---|---|
| locality | Name, boundary geometry, source ID/version and attribution. |
| precinct | Survey polygon, priority tier, owner-reviewed rationale, coverage counts. |
| street_section | Street name, independently sourced LineString, side/direction, explicit start/end descriptions, locality, geometry version and lifecycle state. Geometry must be inside supported coverage and not classified off-street. |
| rule_revision | Section/geometry version, canonical structured schedule, schema version, content hash, predecessor, publication/verification state and effective dates if known. Immutable after submission; corrections create another revision. |
| rule_clause | Days, time intervals, holiday semantics, date bounds, category, fee status, maximum stay, permit/vehicle conditions, sign arrows and exception references. Unknown is distinct from false, zero or absent. |
| observation | Contributor, revision, source type, observation date, source/imagery date, submission timestamp, evidence reference and validation status. One effective vote per eligible contributor per section/change episode. |
| change_episode | Current revision, alternative candidates, first/last report, threshold timestamps, warning state, resolution and decision reason. |
| moderation_event | Actor, action, affected records, reason, previous/new references and timestamp. Append-only for normal roles. |
| profile | Internal auth identity, eligibility status, public alias, role and minimal preferences. Never expose email/provider IDs in public map responses. |
| reward_event | Unique qualifying-action key, signed points, reason, status and reversal reference. No client-supplied totals. |
| entitlement | Start/end, qualifying ledger references and feature state. No active ad-free promises during the ad-free prototype. |
| source_register | Licence/provenance/approval metadata from document 02. |
| holiday_calendar | Jurisdiction, date, holiday name, source version and review date; do not calculate movable holidays from guesswork. |

Geometry changes invalidate the assumption that old votes describe the new extent. Splitting a section creates linked successor sections requiring review; do not copy confirmation totals automatically. Merging requires compatible schedules and an audited migration. Mark old geometries retired, not deleted.

## Canonical agreement

Agreement means the same normalized **complete schedule for the same geometry**, not merely the same displayed colour. Normalize ordering, day sets, time formats and equivalent explicit values, and hash a schema-versioned representation. Do not use fuzzy text matching or an LLM to decide votes. Preserve raw submitted sign text separately for review. A corrected normalization algorithm needs migration review so previously different schedules are not silently merged.

## Evaluation contract

Inputs: section revision; concrete arrival instant; positive intended duration; vehicle/permit context; authoritative local holiday calendar; and evaluation date. Output: `eligible_free`, `eligible_paid`, `restricted` or `unknown`, with reason codes, applied clauses, earliest relevant transition and confidence/freshness metadata.

An ordinary motorist has no permit and no special vehicle entitlement by default. Loading-only and accessible spaces do not qualify merely because no payment is required. Let users inspect these categories, and only offer special eligibility filters when their semantics have been reviewed.

Algorithm requirements:

1. Validate the selected local date/time. Reject nonexistent daylight-saving times and disambiguate repeated times instead of silently shifting the stay.
2. Treat the requested stay as `[arrival, departure)`. A restriction beginning exactly at departure does not affect the stay; one beginning before departure does.
3. Split the interval at all applicable schedule, midnight, date-boundary and holiday transitions. Resolve clauses using reviewed precedence rules, including prohibitions, clearways, permits and special conditions.
4. For every interval, establish permission and price. No applicable clause is not proof of unrestricted parking. Require a complete, reviewed coverage model or return unknown.
5. Apply maximum-stay rules across the appropriate signed length of road/area. Never assume that moving to a nearby bay resets the clock. Complex time-limit carryover across schedule transitions remains unknown until supported by a reviewed legal fixture.
6. Return eligible-free only when the entire stay is permitted, explicitly free, within all applicable duration constraints and based on current usable evidence. Incomplete, conflicting, stale or unsupported rules return unknown for recommendation purposes.
7. Return an understandable explanation, such as “Clearway begins 16:00 during your stay” or “Holiday exception has not been verified.”

Public-holiday interpretation must follow current Victorian rules, not “Sunday equals holiday.” Official guidance distinguishes signs naming weekdays from signs without named days [S11]. Store the interpreted semantics explicitly and cite the reviewed fixture. Event/race-day, school-day and manually activated restrictions need reliable calendars or must remain unknown.

Default proposed freshness interval: 180 days since the most recent eligible observation of the current physical signs. This is configurable policy, not a legal standard. A new submission based on old imagery does not renew freshness. Unverified observations remain inspectable but are excluded from default free recommendations until verification. The user may opt into a separate clearly labelled exploratory layer.

## Minimal API payload principles

Public map projections contain section geometry, display category, summary, confidence, freshness and source labels. They never contain private evidence URLs, personal email, auth-provider identifiers or moderation-only notes. Detail requests return the complete rule explanation and nonidentifying history. Store sign photos privately if photos are enabled, use short-lived access for reviewers, strip location/identity metadata where appropriate, and define retention before launch.

Do not store a user's continuous location or route history. A destination search can be processed transiently; analytics must not collect precise coordinates by default.
