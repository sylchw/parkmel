# Applying a selected hosted migration

Use versioned SQL files and the command-line runner rather than pasting large queries into a browser. The runner previews by default, prints the exact file and SHA-256, and never automatically applies all migrations. This matters because optional migration 010 remains unapproved for the hosted database.

## One-time local setup

Install the PostgreSQL `psql` client. If it is not on PATH, set `PARKMEL_PSQL_BIN` to its executable path. In Supabase’s Connect dialog, obtain a database connection string for the intended project. Use the session pooler when your network cannot reach the direct IPv6 endpoint. Store the connection string as `PARKMEL_DATABASE_URL` in `.env.database.local`; this file is ignored by Git. Include `sslmode=require`. Do not paste the database password into chat or commit it.

## Preview, then apply

```sh
npm run db:apply -- 016_malvern_east_oakleigh_south.sql
node --env-file=.env.database.local scripts/apply-hosted-migration.mjs 016_malvern_east_oakleigh_south.sql --apply
```

Use the filename of the specific tested migration you intend to apply. The runner passes credentials through the subprocess environment, enforces TLS and stops on SQL errors. Transaction boundaries remain those in the versioned SQL file. Large migrations are sent directly to PostgreSQL, avoiding the browser SQL Editor size limit. A failed migration is not automatically retried: inspect the error and the file’s transaction/retry behaviour first.

Run `npm run test:db` and `node tests/db/run.mjs --legacy-geometry` in the isolated test database before applying schema changes. Keep a backup appropriate to the change. The migration runner does not replace migration review, backups or production authorization.

Migrations 018 and 019 register Hawthorn and add its fixed town-centre preview. They are additive and preserve existing street-side IDs. Apply 018 before 019. Laptop setup does not require replaying migrations on the existing hosted project.
