# Town-centre previews, map controls and passwords

## What changes

Visitors see approved street parking around a curated local shopping or station hub. They can drag roughly 80 metres east/west or north/south to try the map. Dragging farther is clamped and shows a sign-in link. Guest zoom stays locked; location/address search and custom arrival/duration require eligible sign-in. The suburb selector chooses among the fixed town-centre previews.

Signed-in users start with a collapsed Map controls panel. The compact summary keeps the selected suburb, arrival and intended stay visible. Expanding it restores suburb, search, parking category and arrival controls. The default visit is 15 minutes. Selecting a suburb centres its local shopping/station hub rather than the polygon's representative point. Some suburbs have several hubs; these are curated navigation anchors, not official town-centre boundaries.

Forgot password appears on the sign-in page. The signed-in header also has Change password. Recovery uses Supabase's PKCE email link and a fixed `/auth/recovery` callback. Open the email in the browser where the request was made. The callback validates the code and the password page requires a verified session. Matching passwords of 8–256 characters are required; successful changes sign the user out. No passwords or provider error details go into URLs or logs.

## How daily data loading works

Migration 017 adds `town_centre_preview(region)`: 17 named (including Hawthorn through migration 019), small fixed windows are accepted. It reads approved publications, caps results at 500 sides, strips contributor identity, source references and original rule identifiers, and leaves raw submissions protected by existing policies. No approval or contribution permissions change.

Next.js Data Cache stores the sanitized schedules per suburb and Melbourne calendar day. Each guest request evaluates the cached schedules for a current 15-minute stay; rules can change at the current time without another database read. The UI shows when the town data was loaded. New approvals can take until the next day to appear in the preview; signed-in requests remain live.

A Vercel job at `14:00 UTC` daily warms all 17 town caches (midnight AEST / 1 am AEDT). It uses a private `CRON_SECRET`, returns 401 for unauthorized requests and fails closed when that setting is absent. The first visitor can load a missing daily cache if preloading has not run yet. Cold concurrent requests or cache eviction can cause extra reads; this reduces normal query costs rather than promising a billing ceiling.

This caches ParkMel parking data; each browser still requests background map tiles. Addresses are searched through a server-authenticated ParkMel route before contacting Photon; logged-out requests cannot trigger an upstream lookup. Grey streets remain unknown if no approved schedule exists; no preview records are invented.

## Hosted activation

1. Save the Supabase database connection in the ignored `.env.database.local` as `PARKMEL_DATABASE_URL`, with `sslmode=require`. Never paste it in chat. A session-pooler connection is appropriate if the direct IPv6 connection is unreachable.
2. Apply only the tested additive migration 017, using the versioned script. Optional migration 010 remains unapproved.

   ```sh
   npm run db:apply -- 017_town_centre_preview.sql
   PARKMEL_PSQL_BIN="$PWD/scripts/psql-via-local-container.sh" node --env-file=.env.database.local scripts/apply-hosted-migration.mjs 017_town_centre_preview.sql --apply
   ```

   The wrapper uses the PostgreSQL client in the existing dedicated local Docker container. It does not run any test SQL on the hosted database. If that container is unavailable, use a locally installed `psql` client and omit the wrapper variable.

3. In Vercel's ParkMel project, add a random private `CRON_SECRET` for Production (no `NEXT_PUBLIC_` prefix), then redeploy. The user enters this new credential; the agent does not enter it through the browser.
4. Supabase URL Configuration must allow `https://parkmel-kappa.vercel.app/auth/recovery`. This URL was added and visually confirmed during setup. Other production aliases need their own fixed recovery callback URL or their existing origin wildcard.
5. Verify `/api/map/preview?region=carnegie` returns approved public fields and `/api/cron/preload` is denied without its bearer secret. Use Vercel's job dashboard to run the authorized warmup and confirm 17 successes.
6. Test recovery with your own account. No real reset email was sent during automated tests. Email delivery depends on the project's Supabase email provider; the built-in sender has restrictions, so public account recovery still needs suitable SMTP for reliable delivery.

Documentation: [Next.js Data Cache](https://nextjs.org/docs/app/api-reference/functions/unstable_cache), [Vercel daily cron setup](https://vercel.com/docs/cron-jobs/manage-cron-jobs), [Supabase password recovery](https://supabase.com/docs/guides/auth/passwords).

## Activation verified — 9 October 2026

Migration 017 was applied to the hosted project through the scripted runner. The production Carnegie preview returned six street-side sections without sign-in. A live browser check confirmed the panning limit and sign-in prompt. Anonymous address search returned 403, and the cron endpoint returned 401 without its secret. The latter confirms that the cron secret is configured; the scheduled warmup itself still needs its first run.

The dedicated Docker client had no network connectivity during activation. A PostgreSQL client was installed in the ignored `.parkmel-local/db-tools` folder and used by the same migration runner. Its TLS connection verified the server against the CA certificate downloaded from Supabase’s Database Settings. The private database URL was percent-encoded locally for special password characters; credentials were excluded from Git.
