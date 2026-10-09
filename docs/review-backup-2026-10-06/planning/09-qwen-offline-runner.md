# Offline Qwen runner: 16k context

Updated 6 October 2026. This guide targets local Qwen 27B with a 16k total context. Reading instructions alone does not authorize implementation. An explicit operator prompt assigning a Q card authorizes that card within its write scope; no additional generic approval is needed. This planning session changes documents only.

## Five execution rules

1. **One explicit task.** The operator supplies Q01, Q02, etc. Read this runner once and that card. Do not read the full task index to choose work. Never continue to another card in this session.
2. **Bound discovery.** Read applicable repository instructions and `state/CURRENT.md` if present. Then read at most four task-relevant files/excerpts, with no individual read exceeding 120 lines. Use targeted symbol searches for larger files. Q01 has a stricter allowlist and needs no application source. No recursive Markdown inventory, source tour or repeated “let me check” sequence. If discovery still leaves a critical question, record a blocker rather than expanding the search.
3. **Act, then stop.** Finish the permitted change, run the relevant locally available check and write a handoff. Default ceiling: eight read/search/list tool calls and three shell commands, excluding edit calls. Stop discovery after four calls without new task-relevant information. If a correct task needs more, hand off an explicitly scoped suffix task. Do not spend the whole context investigating.
4. **Offline and honest.** No browsing, dependency downloads, account setup, secrets, billing or deployment. Missing state means initialize it when the card allows; missing Git means record “not a Git repository”; missing dependencies mean relevant checks are not-run. These observations do not require more exploration. Do not claim code is absent just because state is absent. Preserve existing work.
5. **Small persistent handoff.** Write `state/handoffs/Qnn.md` and a compact `state/CURRENT.md`, then end the run. Distinguish inventory completion from implementation readiness. Do not claim mocked/skipped/live checks passed. No agents or next-task execution.

## Context budget

16k means the total usable context, including tool results and any reasoning counted by the runtime. Target at most 6,000 tokens of loaded instructions/source/results, reserve about 4,000 for edits/final output and 6,000 for reasoning/tool overhead. Check the runtime's actual settings; these are targets, not a tokenizer guarantee. Keep narration to one initial sentence and one final report. Never paste full logs, lockfiles, dumps or the complete planning package.

At approximately 10,000 occupied tokens, stop acquiring context and finish a handoff; use the actual runtime counter if available. Without a counter, obey the read/call limits and keep loaded text under roughly 20,000 characters as a conservative heuristic, not a proof of fit. Reduce this further for token-heavy code or multilingual text. Start a new chat for each task, not another turn in the same growing transcript. If generated code would exceed about 200 changed lines or three implementation/test files, propose suffix cards instead of truncating code.

## Operator preparation

Perform these steps outside the offline model run:

1. Inspect repository instructions and existing work; authorize the implementation scope. Select and record supported dependency versions.
2. Supply a local checkout, pinned lockfile, required Node/package manager and a populated offline dependency store or installed dependencies. Avoid asking Qwen to guess APIs from memory; supply the relevant versioned documentation excerpts/type definitions.
3. Supply a preinstalled PostgreSQL/PostGIS test instance or available container images and a local browser-test runtime. No network pulls are allowed during a card. Missing prerequisites are explicit blockers for the affected checks.
4. Provide independently reviewed holiday/legal fixtures and source policies as local files. Download approved boundary data externally where needed, with licence and provenance. Never supply invented fixtures as observed data.
5. Keep secrets out of prompts and logs. Set real provider credentials outside Qwen. Supply `.env.example` names and local nonsecret configuration only.
6. If state is absent, let Q01 create it. Do not initialize all cards as completed from existing files; inspect only the bounded inventory and record existing code as unverified. Keep implementation state separate from original requirements.

An offline UI can use invented sections and an explicitly labelled schematic background. Live hosted tiles/geocoding/OAuth/council APIs, forum research, Apple setup, field checks and deployment require operator runs. No offline archive of OSM public tiles is authorized.

## Standard per-card prompt

```text
Work in /Users/sylvester/Documents/Repo/ParkMel.
Execute only TASK_ID. This prompt authorizes that card's bounded local work.
First read planning/09-qwen-offline-runner.md once, then planning/qwen-tasks/TASK_ID.md.
Follow the five execution rules and the selected card's narrower read/write scope.
Do not read the task index or explore unrelated documents/source files.
If state/CURRENT.md is absent, initialize it only when this card permits; otherwise report it.
Use only local tools/dependencies. Missing Git/dependencies are observations, not prompts
for more searches. Perform the task, record real checks/not-run checks and a short handoff.
Stop after TASK_ID. Do not start the next task or repeat discovery.
```

If the runtime has no tool access, the operator supplies exact file contents and applies a reviewable patch manually. Qwen must not claim it edited files or ran commands. Label suggested commands separately from observed results.

## Handoff template

Create one short `state/handoffs/Qnn.md` per run (target 250 words or less):

```markdown
# Qnn handoff
Status: done | blocked | needs_review
Objective:
Changed files:
Dependencies checked:
Checks actually run and results:
Checks not run and why:
Requirement/design/test references:
Decisions or interface changes:
Remaining risks:
Next eligible card:
```

`state/CURRENT.md` should contain current branch/commit if applicable; actual dependency/runtime versions; completed cards; blocked cards/reasons; active interface contracts; and links to handoffs. Keep it under 400 words. It is an index, not an accumulating chat transcript. Do not store credentials or exact user locations.

## Stop conditions

Stop the affected card before writing if its dependencies are unproven, existing interfaces conflict, instructions exceed the context budget, or the task requires rights/credentials/network access. Record the exact blocker and next operator action. Continue another genuinely independent card in a new session only after its prerequisites are met. Do not fake test outputs, license clearance, observed street rules or OAuth success.

## Review cadence

After each card, review the diff and checks before marking it done. After each milestone, run relevant cross-card integration tests in a fresh session. Add a small repair card for defects rather than expanding the next feature task. The operator owns live-service and release evidence. Doc-only changes need link/consistency checks, not application tests.
