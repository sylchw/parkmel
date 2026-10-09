# Implementation instructions and task order

This is a handoff for a future implementation session. Do not interpret the presence of these files as permission to deploy, purchase services, send council messages or import unlicensed data. The user has authorized planning only in this session.

## Working rules for the implementer

1. For offline Qwen with a 16k context, read document 09 and exactly one card explicitly selected by the operator from document 10. Follow the five execution rules in document 09. The operator uses document 10; the executing model must not load the whole index. Load only the listed document excerpts and bounded source files, plus applicable repository instructions. Documents 00–08 remain reference material, not a single prompt. Inspect existing work before scaffolding; never overwrite an existing application to match this plan.
2. Implement in small reviewable increments. Update this task register with actual evidence, files changed, verification results and unresolved issues.
3. Keep domain logic independent of UI and infrastructure. Use invented, conspicuously labelled fixtures in tests; never publish them as observed parking data.
4. Stop the affected work package at its stated gate, while continuing independent work. Missing provider credentials need not block local rule-engine development.
5. Do not substitute a polished map for validated data. The default free filter must exclude unsupported cases throughout development.
6. Avoid adding advertisements, payments, native applications or unrelated features. Prototype points are not a promise of future financial value.

## Offline execution units

The T01–T12 rows below are milestones, not single model assignments. Execute the Q01–Q47 cards in document 10 one at a time. A milestone closes only when its constituent cards and operator gates are evidenced. Offline mocks validate local contracts, not hosted services. Never ask an offline model to browse, install missing packages, obtain credentials or deploy.

## Task register and dependency graph

All tasks are currently `not_started`. “Engineer,” “owner,” and “reviewer” are roles to assign at implementation, not people already committed to work. Evidence classes: A = official-source record; B = automated local result; C = real-device/provider result; D = independently collected field evidence.

| ID | Work package | Requirements/design | Dependencies | Owner | Evidence and verification | Proof boundary / stop condition |
|---|---|---|---|---|---|---|
| T01 | Finish competitor/forum audit and source-rights register | R01,R13,R16 / D01 | None | Researcher + owner | A; source matrix and reproducible journeys | Marketing pages do not prove live coverage. Do not collect Google-derived records before rights are cleared. |
| T02 | Scaffold application, migrations and CI commands | R15,R16 / D04 | None | Engineer | B; build, lint, type checks | Local success does not establish hosted configuration. Stop before overwriting existing work. |
| T03 | Implement spatial/versioned data model and RLS | R01,R09,R18 / D01,D03,D04 | T02 | Engineer | B; V01,V08,V13 | No unrestricted base-table access. Stop if a migration loses history or source provenance. |
| T04 | Implement deterministic rules evaluator | R03–R05,R17 / D02 | T02 | Engineer + rules reviewer | A+B; V02–V06 | Only reviewed cases qualify as free. Unsupported transition semantics return unknown. |
| T05 | Configure auth and guest allowance | R06–R08 / D04,D06 | T03 | Engineer + account owner | B+C; V07–V09 | Mock OAuth is insufficient. Both real providers are required for full release. |
| T06 | Implement map, search, filters and mobile sheets | R02–R05,R15 / D01,D02 | T03,T04,T05 | Engineer | B+C; V10,V14,V15 | Do not use provider search without approved configuration/terms. |
| T07 | Implement annotation and evidence forms | R09,R10,R13 / D01,D03 | T03,T05,T06 | Engineer | B+C; V11,V14 | Incomplete forms may be drafts but cannot imply free coverage. |
| T08 | Implement consensus, changes and moderation | R10–R12,R18 / D03 | T07 | Engineer + moderator | B; V11,V12,V13 | Serialize transitions; no majority based only on matching colours. |
| T09 | Implement dormant reward ledger | R14,R18 / D05 | T08 | Engineer | B; V12,V16 | Ads/redemption remain off. No client-controlled points. |
| T10 | Run licensed boundary import and pilot field seeding | R01,R13,R17 / D01 | T01,T03,T07,T08 | Data steward + field contributors | A+D; V01,V17 | Do not label a precinct covered without a measured survey denominator and provenance. |
| T11 | Complete operational and device verification | R06–R08,R15,R16,R18 / D04,D06 | T06,T08,T09,T10 | Engineer + reviewer | B+C+D; V07–V19 | Quota estimates and simulated mobile views alone do not pass release. |
| T12 | Prepare release candidate and owner review | All | T11 | Engineer + owner | Recorded gate checklist | Deployment remains a separate authorized action. Outstanding critical gates prevent public launch. |

Critical application path: T02 → T03 → T05 → T06 → T07 → T08 → T09 → T11 → T12. T04 can proceed after T02; T01 can proceed independently. Field-seeding readiness depends on T01 and the completed submission/moderation flow. Do not claim parallel execution occurred merely because dependencies allow it.

## Work package details

### T01: research closure

Read/write scope: planning source register and audit records only. Produce a per-suburb competitor table with actual test outcomes, forum links/dates and limitations. Draft any needed council data request; do not send without authorization. Record Google-source decision, map-provider rights, boundary attribution and unresolved licence questions. A blocked source should result in an approved alternative, not unlabelled scraped data.

### T02–T04: foundation

Proposed directories: `src/app` for UI/routes, `src/domain/parking` for pure evaluation, `src/domain/community` for canonical schedules and transitions, `src/lib/server` for auth/data adapters, `supabase/migrations` for database changes, and `tests` for domain, database and browser tests. Adapt to existing repository conventions rather than imposing these paths blindly.

Define package scripts before citing them as working: `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, `pnpm test:db`, `pnpm test:e2e`, and `pnpm build`. These commands are proposed contracts, not commands executed during this planning session. Use a supported local database test environment, and skip with an explicit reason if unavailable; a skipped security test is not a pass.

Implement database uniqueness/check constraints, source approval and immutable revisions first. Add pure schedule fixtures with readable inputs and explanations. Store unknown semantics explicitly. Test raw API access and RLS with guest, unverified, eligible and admin roles.

### T05–T07: usable vertical slice

Build a real flow from sign-in to a searched precinct, selected stay, filtered map section and complete contribution. Use a clearly marked fixture environment before field data exists. Verify the timed guest transition, refresh persistence, mobile auth return and draft recovery. Do not allow the server to trust a client-supplied role, elapsed allowance or verified-email flag.

Initial destination search can use curated precincts/localities while licensed address search is configured. State that limitation honestly. A full release should either provide the intended destination coverage or explicitly disclose the narrowed search scope in product copy and owner review.

### T08–T10: trustworthy data

Exercise conflicting submissions and concurrent promotion before using real contributors. Add the admin comparison queue, transaction-safe ledger and cache invalidation. Test importer dry runs with duplicates, wrong CRS, out-of-scope locations and mixed on/off-street source rows. Survey the first Carnegie precinct and evaluate complete stays against current signs before expanding.

### T11–T12: handoff

Prepare a `.env.example` containing names and explanations only; migration/runbook instructions; provider callback checklist; backup/restore procedure; quota disable controls; known unsupported rule cases; and a release checklist with actual evidence links. Produce a concise release-candidate summary distinguishing code tests, device tests, live-provider checks and field checks. Ask for deployment authorization only after that concrete reviewable candidate exists, if authorization has not already been given in the implementation session.

## Completion record template

For each task record: status (`not_started`, `in_progress`, `blocked`, `done`); owner; changed files; requirement/design references; commands or manual steps; actual results; evidence location; unresolved risk; and next dependency unlocked. `done` requires the work package's evidence, not merely a commit. If blocked, state the exact missing input and which independent work can continue.
