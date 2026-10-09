# ParkMel planning and implementation instructions

Prepared 5 October 2026. Status: planning deliverables complete; implementation, field validation and deployment have not started. These documents authorize no purchases or external publication.

## Objective

Build a mobile-browser-first map that helps people find free **on-street parking that suits their entire intended stay**, initially in Carnegie, Caulfield, Murrumbeena, Malvern East, Oakleigh and Clayton. Show the source, age and confidence of community information. Do not imply that a legally usable section has an empty bay.

Treat the Caulfield locality family—Caulfield, Caulfield North, Caulfield South and Caulfield East—as the proposed interpretation of the wider Caulfield scope. Keep locality boundaries configurable and explicitly visible. Other suburbs, including Clayton South, require a later scope decision.

## Read in this order

1. [Product requirements](01-product-requirements.md): scope, access and user journeys.
2. [Data sources and initial coverage](02-data-sources-and-seeding.md): existing services, datasets, licensing and survey priorities.
3. [Parking rules and data model](03-rules-and-data-model.md): geometry, schedules and conservative eligibility.
4. [Community verification and rewards](04-community-and-rewards.md): submissions, changes, confidence and incentives.
5. [Architecture and costs](05-architecture-and-costs.md): proposed stack, authorization and free-tier constraints.
6. [Implementation instructions](06-implementation-instructions.md): ordered work packages, dependencies and completion criteria.
7. [Verification and release](07-verification-and-release.md): meaningful tests and launch gates.
8. [Decisions, risks and sources](08-decisions-risks-and-sources.md): unresolved dependencies, evidence and handoff.

## Offline Qwen implementation handoff

For local Qwen 27B, start a fresh chat with [the exact Q01 starter prompt](11-qwen-start-prompt.md). The operator selects tasks; the model follows bounded discovery and writes a handoff rather than exploring the entire repository.

Use [the offline runner guide](09-qwen-offline-runner.md), then select one task from [the small-task index](10-qwen-task-index.md). Do not load this whole planning package into a 16k context. Each task card lists a narrow objective, dependencies, permitted file scope and acceptance checks. Start a fresh context for each card and record handoff state on disk. External research, package acquisition, OAuth setup, hosted APIs and real-device checks belong to the operator, not the offline model. Application implementation has not started.

## What the research changes

There is a real fragmentation problem, but “no service exists outside the CBD” is too broad. Glen Eira advertises selected Carnegie parking sensors and PayStay, and Stonnington also advertises sensor-assisted parking through PayStay. Monash documents on-street sensors in Oakleigh and Clayton. Sensor presence does not establish a reusable public API, comprehensive restriction coverage, or a free-parking search for a complete stay. The council pages were checked; end-to-end consumer-app coverage still needs the reproducible audit in document 02. No complete, licensed restriction API for all target suburbs has been established.

The first implementation must work using field observations and licensed datasets. Google Street View transcription is a **conditional data-source proposal**, not an approved collection method: manually reading an image does not automatically grant permission to create a competing mapping dataset. Street View access is confirmed as an external hyperlink only: open Google Maps separately, with no embedded viewer, Google SDK, API key or billable Street View API request. The data-reuse assessment is separate from implementing that link.

## Recommended product decisions

- Keep the prototype ad-free. Prepare entitlement records and feature flags for later advertising; do not integrate ads now.
- Use a two-minute cumulative active guest allowance plus a per-page timer. Refresh may reset the page timer and randomize the guest starting view, but cannot restore the cumulative allowance.
- Publish initial annotations as unverified. Five agreeing distinct eligible contributors, or an administrator decision, verify a complete rule revision.
- Use three agreeing change reports within seven days for “change reported”; five agreeing submissions or an administrator can replace an existing revision, subject to freshness and conflict safeguards.
- Use five confidence shades, separate textual verification/freshness indicators, and a configurable proposed reward threshold of 20 accepted points for 72 hours ad-free when that feature eventually launches.
- Use OpenStreetMap-based 2D tiles with MapLibre and a no-cost provider plan. MapTiler Free is the initial candidate; an equivalent licensed free option is acceptable. No paid map subscription or automatic paid upgrade is authorized. Keep Next.js and Supabase/PostGIS.

## Gates that remain open

1. Owner confirms usable data rights before importing any source, especially Google-derived material.
2. Apple developer configuration and any membership expense must be available before claiming both social providers work.
3. Current sign schedules must be surveyed before a locality is advertised as covered.
4. Complex Victorian parking-rule cases require reviewed fixtures; unsupported cases return “unknown,” not “free.”
5. Vercel Hobby and the proposed map-provider free plan must remain eligible for this noncommercial prototype. Advertising requires a new hosting/licensing decision.

The package supplies implementation instructions, not evidence that the application exists. All proposed automated and device tests are currently **not run**. Source checks establish the cited page statements, not completeness of suburb coverage or legal permission for every proposed use.
