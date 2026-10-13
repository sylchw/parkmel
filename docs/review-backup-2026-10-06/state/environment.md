# Environment probe (Q01)

## Toolchain versions observed
- node: v24.20.0
- npm: 11.19.0
- pnpm: not installed
- psql: not installed
- docker: 29.8.2 (build 7fc2dff9bc)

## Repository facts
- `.git`: absent → not a Git repository; no Git commands run.
- `node_modules`: absent.
- Lockfiles (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`): none present.
- `state/`: created by Q01.

## Root config files present (names only, contents not read)
ext.config.ts, tsconfig.json, vitest.config.ts, playwright.config.ts, eslint.config.mjs, postcss.config.mjs, tailwind.config.ts.

## src/ top-level
app, components, lib (directory names only; contents not read).

## Readiness blockers
- No lockfile and no `node_modules` → offline build/unit/e2e checks cannot run.
- No psql → DB checks not-run.
- Docker CLI present but no evidence of running Postgres/PostGIS or browser containers → unverified.

## Not-run checks
All application checks (build, typecheck, unit, db, e2e) not-run due to missing dependencies.