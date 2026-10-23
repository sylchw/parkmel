# Approving parking annotations

Signed-in users with confirmed email can select either grey street side, choose a junction section, and start a draft. The boundaries and side come from the registered geometry. Enter a P limit, select weekday checkboxes and hours, and add timed special conditions where needed. No photo or exact transcription is required in the simple form. These inputs are labelled community interpretations. The optional detailed editor preserves existing source metadata.

Complete submissions go to a private review queue. Drafts remain available locally and through account save; submitting does not publish them automatically. Five distinct confirmed eligible accounts agreeing on the complete rules and local extents can publish an initial section. Repeated submissions from one account do not add votes. Conflicting pending interpretations from one account do not vote. Changes to an already published section require admin review in this pilot.

An admin signs in and opens `/admin`, or **Review annotations** in the map header. Check entered limits, days, hours, junction boundaries, general rules and restriction patches. Verify each rule’s public-holiday setting against the sign. Choosing “No days listed on the sign” automatically includes holidays; named weekdays, even Mon–Sun, automatically exclude them. Contributors can override explicit holiday wording, independently for each parking period or special condition. Public holidays are not automatically Sundays. See the [City of Monash parking guidance](https://www.monash.vic.gov.au/Parking-Streets-Footpaths/Parking/Restrictions). Optionally enter a review note, then choose **Approve and publish** or **Reject**. Decisions are recorded permanently. The queue shows the currently published rules beside each proposal. Compare them before approving a replacement. If the publication changes after the queue loaded, use **Refresh review queue** and compare again. Identical copies can be approved without replacing the publication; repeated clicks are idempotent.

Small loading, permit or no-stopping patches use start/end percentages along the selected side, measured from its start junction. General 2P remains the main colour where parking is permitted; the patch has its own overlay and popup. A restriction covering the whole section is not treated as a small exception. Evidence older than 180 days remains unknown, even after approval.

## Hosted setup

Hosted migrations 001–009 and 011–025 are installed. They include reviewed submissions, publication, audit events, registered street sides and simple community entries. Migration 010 is separately optional and awaiting approval. The application uses the signed-in Supabase client for this flow; it does not need a service-role key for signed-in map publication.

The nominated admin is `driedmelon@gmail.com`. That person must create and confirm their ParkMel account first. A trusted Supabase operator then runs:

```sql
UPDATE public.profile p SET role='admin'
FROM auth.users u
WHERE p.id=u.id AND lower(u.email)='driedmelon@gmail.com'
AND u.email_confirmed_at IS NOT NULL AND p.eligibility='eligible'
RETURNING p.id,p.role;
```

Exactly one returned row confirms assignment; zero rows means signup or verification is incomplete. Do not grant anonymous access or disable email verification to work around email-delivery problems.

The nominated verified account has now been granted its admin role, and live queue access was confirmed on 8 October 2026. The setup SQL above is for recovery or another installation; no further role assignment is needed for this account.

## Matching contributions and corrected rules

Five distinct email-confirmed eligible accounts must agree on the same street side and the same current publication revision. The database compares the full normalized settings: rule type, days and hours, time limit, fees, permit conditions, public-holiday policy and local-zone boundaries. Rule IDs, contributor IDs, evidence timestamps and panel wording do not determine agreement. Different settings form separate groups; three votes for 2P plus two for 1P do not publish either. An account with conflicting pending interpretations for that revision contributes no vote until those alternatives are resolved.

Five matches now approve both initial rules and corrections to an existing publication. The old publication remains until approval. Duplicate retries reuse the same submission; the same account may submit a prior interpretation again after the publication changes. Approval history remains immutable, and repeated admin approval does not duplicate a point or audit event. Admins may approve a correction directly after comparing the current publication.

## Account permissions and direct publication

Open **☰ → Manage users** as an admin. Accounts are identified by their display name and email. **User** accounts submit for review. **Reviewer** accounts can review submissions and use **Approve and publish** in the contribution editor, but cannot list users or change permissions. **Admin** accounts have both parking approval and account-management rights. Eligibility can be suspended separately. Eligible status requires a confirmed email. You cannot change your own permissions. Permission changes are logged in `profile_permission_event`.

The contribution editor shows the saved draft’s road side in blue, its road centre in grey, boundaries A/B and Street View links. Admins and reviewers still need to check the rules and boundaries before direct publication. The database publishes atomically and repeated requests reuse the same contribution.

Contributors can withdraw pending entries from **Settings → Your pending contributions**. Approved history is preserved. Rejection or withdrawal recomputes matching consensus so resolving a conflicting proposal can unlock the remaining five-account agreement. Rejected or withdrawn interpretations require corrected details before resubmission; they are not silently reported as new pending entries.

Migrations **023–025** add these permissions, personal settings, consensus recovery and database conflict validation. Apply them in order with `scripts/apply-hosted-migration.mjs`.
