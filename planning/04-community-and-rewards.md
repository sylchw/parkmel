# Community verification, changes and rewards

The thresholds below are explicit proposed defaults. Keep them in server configuration, covered by tests, and visible in product explanations.

## Contributor eligibility

Count distinct internal authenticated users with verified eligibility, not submissions. Link a person's providers only through an authenticated account-linking flow; never merge accounts solely on a matching email. Google/Apple accounts reduce friction but do not prove five different humans. Use rate limits, anomaly review and moderation to reduce coordinated accounts; do not claim Sybil resistance or introduce intrusive identity checks by default.

An account has at most one active position per section/change episode. Changing a submission replaces its active vote, while retaining history. Suspended or disqualified observations do not count. Recompute affected aggregates transactionally.

## Initial publication and confidence

Publish the first structurally valid complete revision as unverified, with a light shade. Further exact matches support that candidate. Conflicting initial candidates remain visible as a conflict and cannot be represented as settled free parking.

| Eligible agreeing contributors | Confidence level | Default verification state |
|---|---|---|
| 1–2 | 1 | Unverified |
| 3–4 | 2 | Unverified |
| 5–9 | 3 | Community verified |
| 10–19 | 4 | Community verified |
| 20+ | 5 | Community verified |

An administrator may verify with fewer votes, creating an explicit admin-verified state and minimum display level 3. Do not invent community votes. Additional contributors may raise confidence normally. Admin rejection or correction requires a reason and evidence reference.

Hue describes the evaluated parking category; darkness describes confidence. Freshness and change warnings are separate badges/line patterns. An old level-5 record can be stale; darkness never overrules the default exclusion of stale or disputed rules. Do not fade a stale record in a way that misrepresents its historical vote count.

## Rule changes

Use a rolling 168-hour window measured with server UTC timestamps. Count matching complete replacement schedules for the same geometry, from distinct eligible users.

1. One or two reports retain the current revision with a nonpublic pending candidate available to moderators; show the reporter their submission status.
2. Three matching reports trigger a public **change reported** warning. Keep the current rule readable but remove the section from default free recommendations.
3. Five matching replacement submissions within the window can promote the alternative, provided its evidence can reasonably describe newer physical conditions and there is no substantial competing candidate. An admin may resolve earlier.
4. If two incompatible candidates each have at least three eligible reports, mark disputed and require admin resolution; do not let arrival order pick a winner.
5. A warning, once triggered, does not disappear merely because reports age past seven days. Keep it until an admin resolves it or a valid replacement is published.
6. On promotion, archive the prior revision, retain its evidence and open a new confidence history for the replacement. Old vote totals do not transfer or veto the new revision.

Freshness safeguard: five people reading the same older image cannot overturn a newer on-site record. Where source dates cannot establish a plausible newer condition, retain the warning and request admin review. This is a proposed safeguard to the user's five-person rule and should be stated in the UI, not hidden in code.

Admins can restore an earlier revision through a new audit event. Correct the public projection and invalidate affected caches. Do not delete the intervening history. Newly verified information must still pass complete-stay evaluation.

## Concurrency and integrity

Implement vote updates, threshold decisions, publication and reward events in database transactions with row locking or equivalent serialized decisions per section. Use idempotency keys and uniqueness constraints. Two fifth votes arriving together must produce one promotion, one reward per qualifying action and a consistent final state. Reject stale clients proposing against changed geometry, with a recoverable draft and explanation.

## Proposed reward schedule

Use **20 accepted points = 72 hours ad-free** when advertising is introduced. This is configurable; 10 points remains an alternative if pilot participation is too low. During the prototype show contribution points, but clearly label reward redemption as unavailable and make no promise that points will become future advertising credit.

| Accepted action | Points |
|---|---|
| First accepted complete annotation or substantive accepted correction in a primary commercial precinct | 4 |
| Same action in an adjacent access street/activity area | 2 |
| Same action in a low-priority residential area | 1 |
| Useful independent confirmation of a current revision | 1 |

Determine priority from server-maintained precinct geometry, not contributor choice. Prohibited and paid sections earn the same points as free sections at the same priority; otherwise incentives would distort the map.

Points remain pending until community/admin acceptance. One user cannot earn both initial-author and confirmation points for the same revision. Limit repeated confirmation rewards to one per user/section within 90 days, and require a new observation for later freshness rewards. Continue accepting valid confirmations even when unrewarded. Initially cap confirmation rewards at 10 per user per day; review this pilot setting using abuse and participation evidence.

Reverse fraudulent points with compensating ledger events, not overwritten balances. If ads later launch, redeem points atomically, consume each event once, and extend from `max(now, current entitlement end)`. Keep marketing promises, point migration and tax/accounting considerations out of the prototype until the owner approves the commercial phase.

## Moderation queue

Prioritize disputed changes, high-traffic precincts, incomplete sign combinations, expiring observations and suspected coordinated votes. Show geometry, source dates, complete schedules and prior decisions side by side. Admin role checks are server-side. Require a reason for overrides and log role changes separately. A contributor cannot award themselves admin status or approve their own reward through any public API.
