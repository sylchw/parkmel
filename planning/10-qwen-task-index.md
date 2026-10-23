# Small offline tasks

Updated 6 October 2026. Card status labels are original templates; actual execution status is in `state/CURRENT.md` and the relevant handoff. Do not reset previously recorded work to not_started. This index is for the operator to select one task. Do not load it in the executing Qwen session. Read document 09 before running the selected card. T identifiers refer to the parent milestones in document 06; they are not single 16k assignments. Paths below are proposed scopes: map them to existing repository conventions before editing. A path listing is a write ceiling, not a requirement to create unnecessary files.

Dependency completion means reviewed code plus the locally available checks, with unavailable checks explicitly tracked. Tasks involving database proof may proceed as unverified drafts when the operator explicitly permits, but cannot be marked done merely because SQL was written. Source/provider/live checks remain operator gates.

| Card | Objective | Milestone | Dependencies |
|---|---|---|---|
| [Q01: Inventory and offline readiness](qwen-tasks/Q01.md) | Inspect repository and record actual runtime, dependency cache, local database and browser availability. Do not scaffold yet. | T02 | none |
| [Q02: Minimal application shell](qwen-tasks/Q02.md) | Using operator-supplied versions and available dependencies, add the smallest mobile-ready Next.js shell. Keep fixture status explicit. | T02 | Q01 |
| [Q03: Local check commands](qwen-tasks/Q03.md) | Define locally supported lint, typecheck, unit and build commands. Database/browser scripts must clearly fail or report unavailable rather than silently pass. | T02 | Q02 |
| [Q04: Parking domain types](qwen-tasks/Q04.md) | Define versioned complete schedules, explicit fee/unknown states, stay inputs and result reason codes. | T04 | Q03 |
| [Q05: Canonical complete schedules](qwen-tasks/Q05.md) | Normalize complete schedules deterministically for exact agreement. Include geometry/schema version in identity. | T08 | Q04 |
| [Q06: Local time conversion](qwen-tasks/Q06.md) | Convert concrete Melbourne local input to instants using supplied installed library/docs, rejecting gaps and disambiguating folds. | T04 | Q04 |
| [Q07: Holiday semantics](qwen-tasks/Q07.md) | Implement supplied reviewed named-day/no-day/holiday semantics without guessing unsupported legal rules. | T04 | Q06 |
| [Q08: Simple free and restricted periods](qwen-tasks/Q08.md) | Evaluate a single supported schedule period for ordinary vehicles, free/paid/prohibited/permit and maximum duration. | T04 | Q04,Q06,Q07 |
| [Q09: Whole-stay transitions](qwen-tasks/Q09.md) | Partition stays at reviewed transitions and apply half-open intervals. Unsupported carryover stays unknown. | T04 | Q08 |
| [Q10: Spatial and source tables](qwen-tasks/Q10.md) | Create PostGIS/source/geometry foundation with explicit approved provenance and versioned street sides. | T03 | Q03 |
| [Q11: Revision and evidence tables](qwen-tasks/Q11.md) | Create immutable revision/observation structures, geometry references and distinct observation/source/submission dates. | T03 | Q05,Q10 |
| [Q12: Profile roles and RLS](qwen-tasks/Q12.md) | Add minimal profile eligibility/roles and default-deny policies for base tables. Use locally supplied auth-schema fixture where required. | T03 | Q11 |
| [Q13: Public map projection](qwen-tasks/Q13.md) | Expose bounded spatial public projection with no private evidence or contributor identifiers. | T03 | Q12 |
| [Q14: Server eligibility adapter](qwen-tasks/Q14.md) | Map trusted session claims to guest/unverified/eligible/admin states behind a replaceable auth adapter. | T05 | Q12 |
| [Q15: Provider callback wiring](qwen-tasks/Q15.md) | Wire supported auth-library callback and safe return destination; document required external provider setup in handoff. | T05 | Q14 |
| [Q16: Guest time reducer](qwen-tasks/Q16.md) | Implement pure 120-second cumulative foreground allowance with per-page reset and proposed 30-day persistence policy. | T05 | Q03 |
| [Q17: Persisted guest enforcement](qwen-tasks/Q17.md) | Persist anonymous allowance using signed identifiers and enforce protected requests. Use supplied installed signing utility. | T05 | Q14,Q16 |
| [Q18: Map-provider configuration](qwen-tasks/Q18.md) | Define replaceable OSM-based free-plan configuration, attribution and offline schematic mode. No network calls. | T06 | Q02 |
| [Q19: 2D map and section overlay](qwen-tasks/Q19.md) | Render MapLibre flat view and invented labelled section overlay using local resources; keep source/attribution configuration separate. | T06 | Q13,Q18 |
| [Q20: Guest map lock and expiry panel](qwen-tasks/Q20.md) | Wire guest pan-only controls, all map zoom locks, expiry blur/disabled map and accessible sign-in focus. | T06 | Q16,Q17,Q19 |
| [Q21: Stay selector](qwen-tasks/Q21.md) | Build arrival/date/duration form with concrete weekday shortcuts and explicit holiday display. | T06 | Q06,Q07 |
| [Q22: Curated destination search](qwen-tasks/Q22.md) | Implement eligible-only search over operator-supplied or labelled synthetic precincts. No external geocoder dependency. | T06 | Q14 |
| [Q23: Evaluated section endpoint](qwen-tasks/Q23.md) | Join bounded projection with full-stay evaluation and session restrictions. Set appropriate private/public response caching. | T06 | Q09,Q13,Q14,Q17 |
| [Q24: Results list and detail sheet](qwen-tasks/Q24.md) | Present evaluated reason, endpoints, source age and confidence with an accessible list alternative. | T06 | Q19,Q21,Q23 |
| [Q25: External Street View link](qwen-tasks/Q25.md) | Build locally encoded coordinate hyperlink opening externally and preserve existing draft return contract. | T07 | Q24 |
| [Q26: Annotation draft schema](qwen-tasks/Q26.md) | Validate complete sign panels, section version, source and dates; distinguish draft from publishable annotation. | T07 | Q04,Q05 |
| [Q27: Mobile annotation form](qwen-tasks/Q27.md) | Create bounded mobile form for existing sections with full schedule preview and incomplete draft saving. | T07 | Q24,Q26 |
| [Q28: Submission transaction](qwen-tasks/Q28.md) | Validate server-side and transact idempotent submissions with one active vote per eligible identity/episode. | T07 | Q11,Q12,Q14,Q26 |
| [Q29: Confidence calculation](qwen-tasks/Q29.md) | Compute five levels and admin verification floor separately from freshness and category. | T08 | Q05 |
| [Q30: Initial verification publication](qwen-tasks/Q30.md) | Publish valid first revision unverified and verify on five distinct exact votes/admin decision, retaining initial conflicts. | T08 | Q28,Q29 |
| [Q31: Change-window state machine](qwen-tasks/Q31.md) | Model 168-hour three-report warning, five-report replacement, latched warnings and competing candidates. | T08 | Q05,Q29 |
| [Q32: Atomic replacement and freshness](qwen-tasks/Q32.md) | Persist serialized change episodes and enforce newer-evidence safeguards while preserving previous revision history. | T08 | Q30,Q31 |
| [Q33: Moderator decision endpoint](qwen-tasks/Q33.md) | Implement admin-only audited verify/reject/restore decision transaction. | T08 | Q14,Q32 |
| [Q34: Moderator comparison screen](qwen-tasks/Q34.md) | Display current/candidate schedules, source dates and decision reason entry; use local adapter data. | T08 | Q33 |
| [Q35: Reward eligibility calculation](qwen-tasks/Q35.md) | Calculate accepted 4/2/1 priority points and one-point confirmations with duplicate/cooldown/day-cap policy. | T09 | Q29 |
| [Q36: Atomic reward ledger](qwen-tasks/Q36.md) | Record unique accepted reward events and compensating reversals with prototype redemption disabled. | T09 | Q30,Q32,Q35 |
| [Q37: Contribution points UI](qwen-tasks/Q37.md) | Show own accepted/pending points and explicit prototype redemption-unavailable copy. | T09 | Q14,Q36 |
| [Q38: Licensed boundary import dry run](qwen-tasks/Q38.md) | Parse supplied local approved boundary file, transform CRS explicitly, validate extents/IDs and produce dry-run report. | T10 | Q10 |
| [Q39: Field seed import and coverage](qwen-tasks/Q39.md) | Validate supplied field records and compute surveyed denominator/coverage without silently overwriting community revisions. | T10 | Q28,Q38 |
| [Q40: Account privacy and retention contract](qwen-tasks/Q40.md) | Write operator-reviewable contribution deletion/retention contract and test existing public projections for private leaks. Do not invent legal approval. | T11 | Q12,Q28,Q36 |
| [Q41: Failure and quota fallback](qwen-tasks/Q41.md) | Wire tile failure/disabled provider to accessible results and curated search; keep quota configuration no-paid-upgrade. | T11 | Q22,Q24 |
| [Q42: Cross-card domain regression](qwen-tasks/Q42.md) | Run locally available integrated domain/transaction scenarios; this card may report defects but not expand into broad fixes. | T11 | Q09,Q30,Q32,Q36 |
| [Q43: Local browser workflow regression](qwen-tasks/Q43.md) | Exercise fixture browsing, guest expiry, selection, contribution and mobile layout using preinstalled local browser runtime. | T11 | Q20,Q24,Q25,Q27,Q34,Q37,Q41 |
| [Q44: Backup and restore runbook](qwen-tasks/Q44.md) | Describe version-aware private export/isolated restore and perform local rehearsal only if tools/database exist. | T11 | Q39,Q36 |
| [Q45: Source and service operator packet](qwen-tasks/Q45.md) | List exact unresolved source/licence/live-competitor/holiday checks and required evidence for the online operator. Do not perform or claim offline web checks. | T01 | Q01 |
| [Q46: Live integration operator packet](qwen-tasks/Q46.md) | Prepare operator checklist for real OAuth, free tile account, field signs, devices, quotas, restore and current hosting terms. | T11 | Q15,Q18,Q25,Q39,Q43,Q44,Q45 |
| [Q47: Release candidate handoff](qwen-tasks/Q47.md) | Summarize actual offline results, operator evidence and blockers. Do not mark public readiness without live/field proof. | T12 | Q40,Q42,Q43,Q44,Q45,Q46 |

## Milestone closure

T01: Q45 plus online source/service audit. T02: Q01–Q03. T03: Q10–Q13. T04: Q04,Q06–Q09 plus reviewed rule fixtures. T05: Q14–Q17 plus actual provider tests. T06: Q18–Q24. T07: Q25–Q28. T08: Q05,Q29–Q34. T09: Q35–Q37. T10: Q38–Q39 plus field collection/licence gates. T11: Q40–Q46 plus real-device/live-service/restore evidence. T12: Q47 and owner review. Q45 can be prepared immediately after Q01; source clearance must precede actual imports, even though Q38–Q39 can exercise invented fixtures.

If a card exceeds budget, add suffix cards with explicit scopes/dependencies and update this index. Never quietly enlarge the context or omit required tests.
