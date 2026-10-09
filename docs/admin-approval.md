# Approving parking annotations

Signed-in users with confirmed email can select either grey street side, choose a junction section, and start a draft. The boundaries and side come from the registered geometry. Enter a P limit, select weekday checkboxes and hours, and add timed special conditions where needed. No photo or exact transcription is required in the simple form. These inputs are labelled community interpretations. The optional detailed editor preserves existing source metadata.

Complete submissions go to a private review queue. Drafts remain available locally and through account save; submitting does not publish them automatically. Five distinct confirmed eligible accounts agreeing on the complete rules and local extents can publish an initial section. Repeated submissions from one account do not add votes. Conflicting pending interpretations from one account do not vote. Changes to an already published section require admin review in this pilot.

An admin signs in and opens `/admin`, or **Review annotations** in the map header. Check entered limits, days, hours, junction boundaries, general rules and restriction patches. Verify each rule’s public-holiday setting against the sign. Choosing “No days listed on the sign” automatically includes holidays; named weekdays, even Mon–Sun, automatically exclude them. Contributors can override explicit holiday wording, independently for each parking period or special condition. Public holidays are not automatically Sundays. See the [City of Monash parking guidance](https://www.monash.vic.gov.au/Parking-Streets-Footpaths/Parking/Restrictions). Optionally enter a review note, then choose **Approve and publish** or **Reject**. Decisions are recorded permanently. If another review has changed the publication, refresh and review a fresh submission; stale proposals cannot overwrite it.

Small loading, permit or no-stopping patches use start/end percentages along the selected side, measured from its start junction. General 2P remains the main colour where parking is permitted; the patch has its own overlay and popup. A restriction covering the whole section is not treated as a small exception. Evidence older than 180 days remains unknown, even after approval.

## Hosted setup

Hosted migrations 001–009 and 011–014 are installed. They include reviewed submissions, publication, audit events, registered street sides and simple community entries. Migration 010 is separately optional and awaiting approval. The application uses the signed-in Supabase client for this flow; it does not need a service-role key for signed-in map publication.

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
