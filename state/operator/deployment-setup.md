# Deployment setup — 8 October 2026

Target: limited non-commercial real-data pilot; Vercel free plan; OAuth deferred for initial test deployment. Anonymous annotation disabled by user instruction; verified signed-in eligible contributors only. Pilot sign-in method: email/password with verified email; Google/Apple deferred; private invite bypass rejected.

GitHub remote: git@github.com:sylchw/parkmel.git
Supabase project URL: https://fceemqwvbcypextegzce.supabase.co

Local Git initialized on main; generated files, local environments and downloaded test assets ignored. Public Supabase URL recorded in ignored .env.local. No auth/service keys supplied or stored by this setup. .env.example now includes guest signing and synthetic-search settings.

Existing SSH connection to GitHub failed with publickey denial; agent has no loaded identities. Generated dedicated Ed25519 key in ignored .parkmel-local/github_sylchw; repository-only core.sshCommand selects it with IdentitiesOnly=yes. Public key must be added to sylchw GitHub. Repository commit author configured as sylchw <chunhongwei.chw@gmail.com>; user confirms SSH public key added to GitHub. No global Git/SSH configuration changed. SSH verified as sylchw. Existing GitHub initial commit and LICENSE preserved; local implementation is added as its descendant after staged-file review.

Next account steps: identify or create GitHub SSH key for sylchw; enter Supabase public anon key and server-only service role key in local/Vercel settings; create guest signing secret; configure Google OAuth and final redirect allowlist. Prepare and verify hosted migrations before applying; do not apply local auth fixtures to hosted Supabase.

Pilot coverage: Carnegie, Malvern East, Oakleigh, Clayton and Chadstone. User has no verified records and requests first-user manual Street View transcription. Public source reuse is not yet approved. App integration and unfinished contribution/guest workflows remain documented in README and CURRENT.

8 October source review: https://www.google.com/help/terms_maps/ (modified 27 January 2026) restricts copying content and some derived mapping datasets. External links are implemented; manual copying is not automatically approved by using a hyperlink. Draft source must remain street_view, with imagery date retained separately; no automatic verified/free publication. First-user server access and complete structured rule editing remain unfinished.

8 October contribution policy correction: User requires actual sign-in, existing contributor agreement rules and admin approval rights; no anonymous or invite-code substitute. Personal-use Street View transcription requested; preserve street_view provenance and image dates. User instruction overrides the earlier local workflow source-review stop, without asserting external legal approval. UI denies guest/unverified sessions by default; server RLS still denies direct mutation. Server contribution and admin approval transactions remain Q28 and later cards, not implemented by this UI change.

Q15b: /sign-in form and POST /auth/email implement signup/password sign-in; confirmation redirects through PKCE /auth/callback, safe next retained, cross-origin posts denied and unconfirmed sessions rejected. Hosted email delivery, callback allowlist, profile provisioning/eligibility and admin assignment remain unverified. No anonymous first-user bypass.
