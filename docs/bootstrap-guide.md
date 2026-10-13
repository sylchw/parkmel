# ParkMel bootstrap guide

GitHub carries the application and project notes. Private configuration, SSH keys and local test tools are intentionally not committed.

## Get the code running

1. Install Git and Node.js 22.18 or newer, and sign into your GitHub account.
2. For SSH access, create a new SSH key on the new laptop and add its public key to the **sylchw** GitHub account. Alternatively clone over HTTPS using GitHub authentication. Keep private keys private.
3. Clone the project and install its dependencies:

```sh
git clone https://github.com/sylchw/parkmel.git
cd parkmel
npm ci
cp .env.example .env.local
```

4. Fill `.env.local` from your existing Vercel project settings and Supabase dashboard. Copy the settings through a private channel, not chat or Git. The Supabase publishable key is public configuration; server secrets must remain server-only. Do not generate replacements for existing production secrets just to move laptops.
5. Run `npm run dev` and open the local URL printed in the terminal. The existing hosted Supabase project supplies the data. Do not replay production migrations during laptop setup.

The live app remains at https://parkmel-kappa.vercel.app/. Vercel and Supabase keep running without the original laptop.

## Continue with Codex

Install Codex and sign into your account. Open the cloned ParkMel folder. If this conversation is unavailable there, start a new chat and provide this handoff:

> Continue the ParkMel project in this folder. Read README.md, docs/implementation-summary.md, docs/bootstrap-guide.md and relevant project instructions. The current task completed persistent signed-in parking colours during viewport refresh and added Hawthorn. Review the current code and deployment before changing it. Keep private credentials out of chat and Git. Use versioned SQL scripts, not the browser SQL Editor. The owner previously requested a single root commit when publishing; confirm that preference with me before rewriting history again.

This document preserves project context, not a full transcript. If you need this exact conversation, retain a private copy of it and any attachments separately; cloning Git does not transfer chat history.

## Optional development tools

The normal app does not need the large local OSM extract, Docker database or browser test downloads. Recreate these only for the tasks that require them. See tests/browser/pilot.mjs and tests/db/run.mjs for their local runtime expectations.

For hosted database work, install a PostgreSQL client and create the ignored `.env.database.local` with the existing project's session-pooler connection. Obtain credentials privately from Supabase. Follow docs/database-migrations.md and apply only specific tested migrations. The original laptop's ignored `.parkmel-local` tooling and TLS certificate are not included in Git.

## Current project facts

- Verified email/password sign-in; signed-in users contribute; admin or existing community approval workflow publishes rules.
- Admin account: driedmelon@gmail.com. Use your own account password, never share it with the assistant.
- Guest previews use fixed town-centre windows and daily cached approved rules. Signed-in users can explore farther.
- 17 neighbourhoods, including Hawthorn, with 59,270 street-side targets. Road geometry is not parking evidence.
- Migrations 018–019 add Hawthorn geometry and preview. Optional migration 010 has not been applied to the hosted project.
- Map refreshes retain prior results while loading and after temporary failures; successful responses replace them. Zooming too far out still shows the zoom-in notice.
- Production email delivery/custom SMTP and the Melbourne-only self-hosted Photon plan remain separate launch work; see docs/launch-pending.md.
