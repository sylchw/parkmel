# Apply the same rules to several street sections

Open a street side's contribution editor and enter its parking rules as usual. Expand **Apply the same rules to more of [street name]**. Select additional sides on the blue/grey overview map or in the checkbox list. Each item names its junction boundaries and links to Street View.

For a long road, use **Select a stretch between junctions**:

1. Choose **From junction / boundary** and **To junction / boundary** around the original section. Coordinates distinguish boundaries with the same name.
2. Choose **Same side as original selection** or **Both sides**. The original-side choice follows a continuous side even where the stored geometry direction reverses. Reversing From and To keeps that same physical side.
3. Select **Apply range**. This replaces the previous selection, brings the map preview in around that stretch, and requires confirmation again. **Show whole street overview** brings back the wider map. Individual map/checkbox adjustments remain available.

Ranges must include the original section. Endpoints must connect along the loaded same-named road: nearby carriageways, roads that cross without a shared endpoint, and matching junction labels are not joined automatically. If there are multiple possible routes, ParkMel asks for closer boundaries or manual selection rather than guessing. Divided roads can need separate contributions. No range is silently truncated when it exceeds the limit.

**Select whole street in this suburb (both sides)** selects all listed sides when there are at most 100. Longer roads can be submitted in groups of up to 100 sides. The original side stays selected. The individual checkbox labels use each section's own left/right direction, which can vary along the road; the range selector accounts for those reversals. Always check the highlighted sides and boundaries.

Check that the exact rules apply to every selected side, then use **Submit for review**. Admins and reviewers retain **Submit without review** as a separate choice. Changing the rules or selection clears the multi-section confirmation. Saved selections are retained in this browser, scoped to the signed-in account and original section; reloading requires confirmation again. The regular **Save draft** action still saves the original draft to the account.

Rules with restrictions applying only to a percentage of one section must be entered individually. That percentage would identify a different location on another section. Unnamed roads are also handled individually.

Each selected side becomes its own contribution with the registered side, endpoints and schedule identity. Moderation, five-distinct-account consensus, revision handling and approved-entry points stay independent for each side. A selection is one database transaction: failure rolls back the whole batch. Retrying uses the existing per-side retry identity, so it does not create duplicate entries or reward points.

## Implementation and verification

Migration **031_multi_section_contributions.sql** adds one authenticated RPC, `submit_street_annotations(jsonb,uuid[],boolean)`, with no new tables or changes to existing data. It checks verified eligibility and reviewer permission, limits batches to 100 distinct IDs including the source, verifies the same named road, rejects local extents and missing confirmation, rebinds each payload to registered geometry, and locks sections in sorted order before using the existing submission/approval functions. Anonymous access is revoked. `/api/annotations` independently validates the source draft and selection with the trusted server registry before making one RPC call.

The range helper builds a graph from exact registered segment endpoints, deduplicates the two sides into one edge, and accepts only a unique path containing the source. It derives the per-segment side from route orientation and enforces the existing 100-side cap. Range computation uses the street file already loaded; only background preview tiles may load as the view changes. Submission permissions and database functions are unchanged.

The contribution picker uses a shared SVG tile viewport rather than creating a WebGL map for every section. Both the mouse/touch map and native checkboxes are available; the map also supports keyboard selection.

Checks cover unknown/duplicate/mixed-street IDs, required confirmation, permissions, late-failure rollback, retries after consensus, five-account voting per side, opposite-order concurrent batches, and mobile/desktop Chromium and WebKit selection and submission. Test writes use isolated fixtures, never production parking observations. Run `npm run test:unit`, both DB layouts, and `npm run test:e2e`.

Range checks cover reversed direction, both sides, disconnected or ambiguous paths, branches, parallel roads, crossings without a shared node, missing sides, 100/101/102-side boundaries, focused previews, and an imported Dandenong Road range. Browser checks exercise ranges and normal review submissions on phone and desktop widths in Chromium and WebKit.
