# ParkMel: remaining launch tasks

Checked 8 October 2026 against current repository state and hosted setup notes. Coverage implementation now includes 14 suburbs and 48,034 registered street sides. Hosted migrations 011–014 are applied; zero invalid geometries were found. This geometry setup is not proof of a real signed-in contribution.

## Before completing the first live publication

1. **Email delivery and confirmed signup.** Configure a supported transactional email sender/domain for invitations beyond Supabase's built-in recipient restrictions. You have not supplied an email provider or a domain you control. The nominated pilot account is now email-verified. Sender/domain setup for broader invitations remains pending.
2. **Admin role.** Completed on 8 October 2026: the verified nominated account has the admin role, and its live `/admin` queue was opened successfully with a pending submission.
3. **Live workflow test.** On the hosted app, select a street side and junction section, save/reload a draft, submit a complete sign interpretation, approve it as admin and refresh the map to confirm the published colour/details. Also confirm an ordinary account cannot review or approve as admin. A real submission is now visible in the hosted admin queue. Manual approval and confirmation of its published map details remain outstanding; no real submission was approved by the agent.
4. **Initial parking annotations.** The road geometry is present, but it is not parking evidence. Contribute and review initial signs in the 14 covered suburbs; annotation tooling itself is implemented. Keep local no-stopping/loading patches alongside the general parking rule where appropriate.

## Before semi-public invitations

5. **Private Photon service.** Follow [the Melbourne-only self-hosting plan](photon-self-hosting-plan.md): create the polygon/filter/import pipeline, measure the final index, prepare the server proxy/cache/limits, obtain a hosting account/budget/HTTPS endpoint, deploy the service, verify zero demo API traffic and complete the small-group soak. None of the private server infrastructure or new proxy is implemented yet. The current address lookup still uses Photon’s public demo.
6. **Launch checks.** Complete real phone/desktop signup and annotation checks, outage handling, backup/recovery and operator review of the evidence/publication process. Choose who handles moderation and hosting alerts.

## Separate improvements and deferred features

- **Shared geometry migration 010:** tested locally and staged, but not applied to production. It changes the schema and removes duplicated geometry after linking the shared segments, so explicit approval is still pending. This is a storage improvement, not a requirement for the currently installed 008–009 annotation workflow.
- **Holiday coverage:** the reviewed fixture covers Melbourne 2026. Add reviewed 2027 coverage before relying on the app for stays in that year; unsupported dates remain unknown.
- **Scale beyond the current 14 suburbs:** add viewport/vector-tile delivery where needed, benchmark the full server registry and review divided-road geometry. Additional imports need stable IDs and a reviewed update process. A Melbourne geocoder does not automatically provide Melbourne-wide parking annotations.
- **Deferred product work:** timed guest preview, rewards and automated change-publication workflows remain outside the current signed-in pilot. Google/Apple sign-in remains intentionally deferred; verified email is the chosen method.

The older implementation-summary entries and historical CURRENT notes describe earlier stages. They should not be interpreted as current blockers for features subsequently implemented: structured annotation editing, submission/admin review, arrival controls, unique road search, two street-side targets and numbered-address lookup now exist.
