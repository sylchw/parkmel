# Parking map colours

Reviewed on 8 October 2026 using [Glen Eira parking rules](https://www.gleneira.vic.gov.au/services/parking/parking-rules), [Glen Eira residential permits](https://www.gleneira.vic.gov.au/services/parking/parking-permits), and [City of Melbourne Southbank parking consultation](https://participate.melbourne.vic.gov.au/southbank-parking-review/community-consultation). These are app display colours, not official traffic-sign colours.

The P number describes a parking duration. Metered signs add payment: 2P Meter is paid parking with a two-hour limit. City of Melbourne also describes untimed P Meter spaces. Permit-only zones require the applicable permit; they are distinct from ordinary timed parking with a permit exemption. Other panels and their active hours matter, including no stopping and clearways. No Parking permits limited pickup/dropoff in specified circumstances and is not an ordinary short parking allowance.

| Colour | Active zone/limit |
| --- | --- |
| Gold | Below 1P (under 60 minutes) |
| Orange | 1P–under 2P (60–119 minutes, including 90-minute limits) |
| Teal | 2P–under 4P (120–239 minutes) |
| Blue | 4P and above (240 minutes or longer) |
| Green | No signed time limit in the applicable recorded rules |
| Purple | Permit only |
| Red | No parking, no stopping or clearway |
| Brown | Loading or accessible-only zone |
| Grey | Unknown rules or road waiting for annotations |

A magenta edge adds the metered/paid requirement without hiding the time-limit colour. Red dashes mark a selected stay that exceeds the signed limit. Section and list details retain the exact limit, payment state and eligibility explanation. Colour alone is not a statement that a particular vehicle may park. The evaluator currently assumes an ordinary vehicle without a permit.

Exactly 4P belongs to the 4P+ band, so bands do not overlap. Untimed paid parking is green with a magenta edge. Unknown payment is labelled explicitly and never treated as free. The existing schema records paid fees, not payment mechanism, so the display says metered/paid rather than claiming a physical meter.

Display summaries are computed server-side from evaluator-applied rules, without publishing private rule IDs, source identifiers or raw schedules. Inactive panels do not colour the section. Missing, stale, disputed or unsupported evidence stays grey. A known paid requirement with an unknown tariff can show the signed band and paid edge, while stay eligibility remains unknown. No permission or holiday exemption is inferred merely because a panel is inactive.

The initial grey baseline is a bundled OpenStreetMap road-centreline snapshot (see [geometry provenance](carnegie-street-source.md)); it is not parking evidence. Approved database street-side geometry renders above that baseline.
