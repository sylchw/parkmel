# Copy/paste prompt: Qwen 27B, 16k context

Start a **new chat** for this prompt. Do not append it to the exploration transcript. Disable automatic attachment of the whole planning folder/repository where the local client supports this; set the runtime total context to 16k and keep output/thinking allowances within it. No particular Qwen model variant or client settings API is assumed.

```text
Work in /Users/sylvester/Documents/Repo/ParkMel.
Execute Q01 only. I authorize writing its three state/inventory files.
First read planning/09-qwen-offline-runner.md once, then planning/qwen-tasks/Q01.md.
You are local Qwen 27B with a 16k TOTAL context. Follow the runner's five rules.
Do not read planning/10-qwen-task-index.md, other planning documents, application source,
configuration contents, test files or Git history. Q01's narrower allowlist governs.
Read package.json once and perform Q01's single bounded environment probe.
If state is missing, create it. If .git is missing, record that and do not run git.
If node_modules or a lockfile is missing, record the offline-readiness blocker;
do not investigate further, install anything or alter application code.
Write state/CURRENT.md, state/environment.md and state/handoffs/Q01.md immediately
once the bounded inventory is complete. Existing source/config files are unverified work,
not proof that their associated tasks are done. Q01 inventory can be complete while
implementation/test readiness remains blocked.
Use one initial sentence and one final report. Stop after Q01; do not start Q02.
```

For later sessions, explicitly choose one card and use the standard prompt in document 09 with its ID substituted. Before assigning Q02, review Q01 and provide its missing offline prerequisites. Do not ask Qwen to “continue the whole plan” or to rediscover the next task. The failed exploration log need not be pasted into subsequent sessions.

## Resume/review prompt for an existing task

Start a fresh chat and replace Q04 below with the exact assigned card. The operator selects it from `state/CURRENT.md`; do not ask the model to choose by scanning the index.

```text
Work in /Users/sylvester/Documents/Repo/ParkMel. Review/resume Q04 only.
I authorize corrections within Q04's existing write scope and its state handoff.
Read planning/09-qwen-offline-runner.md, planning/qwen-tasks/Q04.md,
state/CURRENT.md and state/handoffs/Q04.md if present, once each.
Follow the five execution rules and 16k total context budget.
Read only Q04's allowed implementation/test files and relevant short reference excerpts.
Compare every acceptance item with current code. Existing files are editable within scope;
missing required fields must be fixed or reported, not dismissed as pre-existing.
Preserve correct work. Do not reread the full index or repeat repository inventory.
Run the task's available required checks. If a check fails, report failure; if unavailable,
report not-run. Do not mark done until all required local evidence exists.
Update the Q04 handoff and CURRENT. Stop after Q04; do not start Q05.
```

## Historical Q05 prompt (now completed by review)

The prompt below is historical; CURRENT now records reviewed Q01–Q05. Use the Q06 prompt at the end for the next session:

```text
Work in /Users/sylvester/Documents/Repo/ParkMel. Execute Q05 only.
I authorize Q05's bounded local edits and state handoff.
Read planning/09-qwen-offline-runner.md, planning/qwen-tasks/Q05.md and
state/CURRENT.md once. Read the reviewed completion section of Q04's handoff
only if needed; do not repeat inventory or load the task index.
Inspect src/domain/parking/types.ts and validation.ts, then implement the
canonical schedule representation/hash and focused tests in Q05's scope.
Include schema/section/geometry identity and complete rule semantics;
exclude observer provenance, generated display IDs and confidence from agreement.
Different fee/holiday/permit restrictions must never hash as the same schedule.
Use locally installed packages only. Run focused tests, npm run typecheck
and npm run lint. If required checks are unavailable, record needs_review.
Write state/handoffs/Q05.md and update CURRENT, then stop. Do not start Q06.
Keep the total 16k context and the runner's discovery budget.
```

## Current next-task prompt: Q06

```text
Work in /Users/sylvester/Documents/Repo/ParkMel. Execute Q06 only.
I authorize Q06's bounded local edits and handoff.
Read planning/09-qwen-offline-runner.md, planning/qwen-tasks/Q06.md and
state/CURRENT.md once. Read only the relevant dependency handoff if needed.
Do not rerun inventory, load the task index or read unrelated source files.
Inspect the current time/stay types and the locally installed date-fns-tz API
needed for this task. Do not install/download anything or assume a missing database
blocks pure time logic. Existing corrected Q01–Q05 work must be preserved.
Implement only Melbourne local-time conversion: reject nonexistent spring-forward
input and require explicit disambiguation of repeated fall-back times.
Use explicit synthetic DST fixtures; do not invent parking rules or holiday dates.
Run focused tests, npm run typecheck and npm run lint. Mark done only when
required local checks pass; otherwise record needs_review or the exact blocker.
Update state/handoffs/Q06.md and CURRENT. Stop after Q06; do not start Q07.
Keep the total 16k context and bounded read/output limits.
```
