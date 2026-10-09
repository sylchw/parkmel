# Carnegie street geometry

© OpenStreetMap contributors, ODbL 1.0: https://www.openstreetmap.org/copyright

A one-off road-centreline extract downloaded via https://overpass-api.de/api/interpreter on 8 October 2026. The query rectangle is a product survey area around Carnegie, not an official suburb boundary. Roads extending beyond the rectangle may be included because OSM ways are complete.

Query:
```overpass
[out:json][timeout:30];way["highway"~"^(residential|tertiary|secondary|primary|unclassified|living_street|service)$"](-37.901,145.044,-37.876,145.072);out geom;
```

OSM geometry identifies roads only. It provides no verified parking rules and no permission to park. The grey overlay means parking rules have not been recorded; it is not a set of publishable street-side sections. The snapshot is bundled locally, so user map navigation does not make Overpass queries.

897 road ways included. Database-approved street-side parking sections render above this grey baseline.

## Junction sections and street sides

`node scripts/build-street-sections.mjs` derives `public/carnegie-sections.json` from the same OSM source. Shared OSM coordinates split each way at junctions; crossings without a shared node (such as bridges) are not treated as junctions. Each segment has two stable section IDs, one per side. Both keep the source centreline; the map offsets them to make two selectable lines. Left/right is measured looking from the displayed start boundary towards its end. OSM way boundaries may also produce an extra section; this is preferable to silently joining geometry with different identity.

There are 1,623 segments and 3,246 sides. These are geometry records, not parking observations. Migration 009 installs exactly the same identities in Supabase. Parking rules must be entered separately. Do not regenerate the geometry after publication without a versioned migration and review of affected annotations.

Migration 010 stores one shared centreline per junction segment, keeping both existing side IDs. The measured local footprint of 1,623 shared geometries plus their spatial index is 440 KB. This excludes side metadata, observations, audit history and the rest of Supabase; it is not a metropolitan capacity estimate. A citywide rollout should import geometry in regions, serve vector tiles by viewport and measure actual database/index/history growth before expanding the free-tier footprint.
