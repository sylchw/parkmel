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
