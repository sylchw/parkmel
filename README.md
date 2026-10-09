<p align="center">
  <img src="public/brand/parkmel-logo.png" alt="ParkMel parking-pin logo" width="160" />
</p>

<h1 align="center">ParkMel</h1>

<p align="center"><strong>Find your street. Plan your park.</strong></p>

<p align="center">
  Explore Melbourne street parking, choose your arrival time and length of stay,<br />
  and understand the rules for that visit.
</p>

<p align="center">
  <a href="https://parkmel-kappa.vercel.app/">Try ParkMel</a> ·
  <a href="#help-map-your-neighbourhood">Contribute parking rules</a> ·
  <a href="#for-developers">Developer setup</a> ·
  <a href="https://github.com/sylchw/parkmel/issues">Feedback</a>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/licence-MIT-15803d" alt="MIT licence" /></a>
  <img src="https://img.shields.io/badge/built_for-Melbourne-2563eb" alt="Built for Melbourne" />
  <img src="https://img.shields.io/badge/community_project-in_development-f59e0b" alt="Community project in development" />
</p>

---

## Why ParkMel?

A parking sign is only useful once you know when you’ll arrive and how long you need to stay. ParkMel brings street parking rules onto a map to help you explore an area and compare nearby options for your visit.

Community contributions help build a useful picture of local parking, with **review and approval before rules are treated as verified**. Earn **1 contribution point per approved entry**; your total appears in the signed-in top bar. Rewards for points are planned for the future.

## Explore, plan, park

| What you want to do | How ParkMel helps |
| --- | --- |
| Find a place | Search for a road or a street address, then explore the surrounding streets. |
| Plan your visit | Choose your arrival time and length of stay to see how recorded rules apply. |
| Compare nearby options | Street colours distinguish parking time limits and restrictions; a magenta edge identifies paid parking. |
| Check a street side | Select its outline to see the parking rule and a Google Maps Street View link for checking signs. |
| Add what you know | Grey streets are an invitation to help map local parking rules. |

**Sign in for full functionality**, including contributions and map zoom. On desktop, use **Ctrl/Command + scroll** to zoom; ordinary scrolling moves the page. On phones, pinch to zoom.

ParkMel explains parking rules; it does not show whether a space is currently vacant. Check the signs where you park.

## Help map your neighbourhood

1. Sign in with a verified email address and select a street side.
2. Enter a limit such as **5 min, 1P or 2P**, tick the applicable days, and set the hours.
3. Add special conditions such as tow-away, clearway, loading or permit-only periods when needed.
4. Save a private draft or submit your interpretation for review. **No sign photo is required.**

Each rule has its own public-holiday setting. Indicate whether days are printed on the sign; the holiday setting adjusts automatically and can be overridden for explicit holiday wording.

An admin can approve or reject a submission. For a section’s first publication, matching submissions from **five distinct verified, eligible accounts** can also establish approval. Changes to published rules currently require admin review.

Both street sides are recorded separately, with sections split at junctions. Small restrictions can appear alongside the street’s general parking rule.

## Growing around Melbourne

Street outlines are ready for contributions in:

**Carnegie · Chadstone · Bentleigh · Brighton · Malvern · Oakleigh · Clayton · Springvale · Mulgrave · Clayton South · Moorabbin · Hampton · St Kilda · Glen Waverley · Malvern East · Oakleigh South · Hawthorn**

Coverage grows as people record and review signs. Grey outlines show where rules can be added. Address search can locate places across metropolitan Melbourne and switches to a covered suburb when appropriate.

Want to contribute in another suburb? [Tell us where](https://github.com/sylchw/parkmel/issues).

---

## For developers

Built with **Next.js · React · TypeScript · Supabase/PostGIS · MapLibre**. Address lookup currently uses Photon with OpenStreetMap data.

### Run locally

Use **Node.js 22.18 or later**:

```sh
git clone https://github.com/sylchw/parkmel.git
cd parkmel
npm ci
cp .env.example .env.local
npm run dev
```

Configure your Supabase URL and public publishable key in `.env.local`, then open the address printed in the terminal. Keep private credentials out of commits. Account features require the database migrations and email-confirmation setup in the [pilot setup guide](docs/pilot-setup.md).

### Check your changes

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

Browser and database checks are available through `npm run test:e2e` and `npm run test:db`. They require the local test runtimes described in the project notes; database checks use an isolated local database.

### Go deeper

| Guide | What’s inside |
| --- | --- |
| [Bootstrap guide](docs/bootstrap-guide.md) | Set up the project and continue development |
| [Pilot setup](docs/pilot-setup.md) | Configuration and hosted setup |
| [Database migrations](docs/database-migrations.md) | Applying selected SQL files from the command line |
| [Contribution review](docs/admin-approval.md) | Submission, review and approval |
| [Street geometry](docs/suburb-street-source.md) | How coverage is built and maintained |
| [Photon hosting plan](docs/photon-self-hosting-plan.md) | Melbourne-only address-search infrastructure |
| [Launch planning](docs/launch-pending.md) | Current prerequisites and planned work |
| [Implementation notes](docs/implementation-summary.md) | Technical detail and development history |

## Contributing

Bug reports, usability feedback and code contributions are welcome. [Open an issue](https://github.com/sylchw/parkmel/issues) with the steps to reproduce a problem, the expected behaviour, and your browser or device. Discuss larger changes before starting work.

## Data and licence

Map and address data include [© OpenStreetMap contributors](https://www.openstreetmap.org/copyright). Parking interpretations come from community submissions and their recorded sources.

ParkMel’s code is available under the [MIT licence](LICENSE). Third-party data and services retain their own licences and terms.
