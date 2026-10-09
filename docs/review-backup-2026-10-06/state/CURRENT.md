# CURRENT

Milestone: T02. Completed: Q01 (inventory), Q02 (minimal shell), Q03 (local check commands), Q04 (parking domain types).

## Environment
- Node v24.20.0, npm 11.19.0, Docker 29.8.2 present.
- No psql, no pnpm.
- No `.git` (not a Git repository).
- No `node_modules`, no lockfile → offline build/test readiness blocked.

## Existing root files (unverified)
package.json, next.config.ts, tsconfig.json, vitest.config.ts, playwright.config.ts, eslint.config.mjs, postcss.config.mjs, tailwind.config.ts, docs/, planning/, src/.

## Shell (Q02)
- src/app/layout.tsx — root layout, Inter font, mobile viewport meta added.
- src/app/page.tsx — home page (links to /search, /about — routes not yet created).
- Stack: Next 15.1.0, React 19, Tailwind, MapLibre 4.7.1, Supabase 2.47.10.

## Check commands (Q03)
- `npm run lint` — next lint (not run: no node_modules).
- `npm run typecheck` — tsc --noEmit (not run: no node_modules).
- `npm run test:unit` — vitest run (not run: no node_modules).
- `npm run build` — next build (not run: no node_modules).
- `npm run test:db` — echoes unavailable, exit 1 (verified).
- `npm run test:e2e` — echoes unavailable, exit 1 (verified).
- tests/unit/smoke.test.ts — tiny real test for vitest runner.

## Parking domain (Q04)
- src/domain/parking/types.ts — existing, defines ParkingRule, ParkingStay, EvaluationResult, etc.
- src/domain/parking/validation.ts — new, validateParkingRule and validateParkingStay functions.
- tests/parking/validation.test.ts — new, unit tests for validation.
- Checks: typecheck/unit not run (no node_modules).

## State
- `state/environment.md` — probe results.
- `state/handoffs/Q01.md` — Q01 handoff.
- `state/handoffs/Q02.md` — Q02 handoff.
- `state/handoffs/Q03.md` — Q03 handoff.
- `state/handoffs/Q04.md` — Q04 handoff.

## Next
Q05 pending operator assignment and its own preflight. Requires Q04 done + offline prerequisites (lockfile, node_modules, DB/browser runtime).
