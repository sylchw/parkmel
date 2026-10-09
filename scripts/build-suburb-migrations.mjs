import {readFile,writeFile,mkdir} from 'node:fs/promises';
const {suburbs}=JSON.parse(await readFile('public/coverage/manifest.json','utf8'));
const legacy=JSON.parse(await readFile('public/carnegie-sections.json','utf8'));
const all=JSON.parse(await readFile('data/coverage-sections.json','utf8'));
const oldIds=new Set(legacy.features.map(feature=>feature.id));
const segments=new Map();for(const feature of all.features){if(oldIds.has(feature.id))continue;const key=feature.properties.segmentId,entry=segments.get(key)??{sides:{},feature};entry.sides[feature.properties.side]=feature.id;segments.set(key,entry);}
const quote=value=>`'${value.replaceAll("'","''")}'`;
let migration=`BEGIN;
CREATE TABLE public.pilot_coverage_area(id text PRIMARY KEY,name text NOT NULL,geom public.geometry(MultiPolygon,4326) NOT NULL);
ALTER TABLE public.pilot_coverage_area ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pilot_coverage_area FROM anon,authenticated;
CREATE INDEX pilot_coverage_spatial ON public.pilot_coverage_area USING gist(geom);
`;
for(const region of suburbs){const [w,s,e,n]=region.bounds;const geometry=region.geometry?`public.ST_SetSRID(public.ST_GeomFromGeoJSON(${quote(JSON.stringify(region.geometry))}),4326)`:`public.ST_Multi(public.ST_MakeEnvelope(${w},${s},${e},${n},4326))`;migration+=`INSERT INTO public.pilot_coverage_area VALUES(${quote(region.id)},${quote(region.name)},${geometry});\n`;}
migration+=`-- Support both hosted 008-009 geometry and the optional normalized 010 schema.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pilot_street_side' AND column_name='geom') THEN
 EXECUTE 'CREATE VIEW public.pilot_side_geometry AS SELECT id,geom FROM public.pilot_street_side';
 ELSE
 EXECUTE 'CREATE VIEW public.pilot_side_geometry AS SELECT s.id,g.geom FROM public.pilot_street_side s JOIN public.pilot_street_segment g ON g.id=s.segment_id';
 END IF;
END;$$;
REVOKE ALL ON public.pilot_side_geometry FROM PUBLIC,anon,authenticated;
`;
const original=await readFile('supabase/migrations/008_pilot_review.sql','utf8');const start=original.indexOf('CREATE FUNCTION public.pilot_section_schedules('),end=original.indexOf('\nREVOKE ALL ON FUNCTION',start);
let projection=original.slice(start,end).replace('CREATE FUNCTION','CREATE OR REPLACE FUNCTION').replace('west>=145.03 AND east<=145.10 AND south>=-37.91 AND north<=-37.86','west>=144.9 AND east<=145.3 AND south>=-38.05 AND north<=-37.78').replaceAll('s.geom','g.geom').replace('FROM public.pilot_street_side s JOIN public.pilot_publication','FROM public.pilot_street_side s JOIN public.pilot_side_geometry g ON g.id=s.id JOIN public.pilot_publication');
projection=projection.replace(' RETURN (WITH candidates AS (',` IF NOT EXISTS(SELECT 1 FROM public.pilot_coverage_area WHERE public.ST_Intersects(geom,public.ST_MakeEnvelope(west,south,east,north,4326))) THEN RETURN jsonb_build_object('sections','[]'::jsonb,'truncated',false);END IF;\n RETURN (WITH candidates AS (`);
migration+=projection+`\n-- Operator-only importer: no browser/authenticated/service-role grants.
CREATE FUNCTION public.register_pilot_geometry_batch(rows jsonb) RETURNS integer LANGUAGE plpgsql SET search_path='' AS $$
DECLARE item jsonb;g public.geometry;segment uuid;inserted integer:=0;side_name text;side_id uuid;
BEGIN
 IF jsonb_array_length(rows)>200 THEN RAISE EXCEPTION 'Use batches of at most 200 segments';END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(rows) LOOP
  g=public.ST_SetSRID(public.ST_GeomFromGeoJSON(jsonb_build_object('type','LineString','coordinates',item->6)),4326);
  IF NOT public.ST_IsValid(g) OR public.ST_NPoints(g)<2 OR public.ST_Length(g)=0 THEN RAISE EXCEPTION 'Invalid geometry';END IF;
  segment=md5(encode(public.ST_AsEWKB(g),'hex'))::uuid;
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pilot_street_side' AND column_name='segment_id') THEN
   INSERT INTO public.pilot_street_segment(id,geom) VALUES(segment,g) ON CONFLICT DO NOTHING;
  END IF;
  FOR i IN 0..1 LOOP
   side_name=CASE WHEN i=0 THEN 'left' ELSE 'right' END;side_id=(item->>i)::uuid;
   IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pilot_street_side' AND column_name='segment_id') THEN
    INSERT INTO public.pilot_street_side(id,geometry_version,street_name,side,start_description,end_description,direction,segment_id) VALUES(side_id,1,item->>2,side_name,item->>3,item->>4,item->>5,segment) ON CONFLICT DO NOTHING;
   ELSE
    INSERT INTO public.pilot_street_side(id,geometry_version,street_name,side,start_description,end_description,direction,geom) VALUES(side_id,1,item->>2,side_name,item->>3,item->>4,item->>5,g) ON CONFLICT DO NOTHING;
   END IF;
   inserted=inserted+1;
  END LOOP;
 END LOOP;
 RETURN inserted;
END;$$;
REVOKE ALL ON FUNCTION public.register_pilot_geometry_batch(jsonb) FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
`;
await writeFile('supabase/migrations/011_multi_suburb_coverage.sql',migration);
const entries=[...segments.values()].map(({sides,feature:f})=>[sides.left,sides.right,f.properties.name,f.properties.startDescription,f.properties.endDescription,f.properties.direction,f.geometry.coordinates]);
await mkdir('work/suburb-import/sql',{recursive:true});let bulk='BEGIN;\n';for(let offset=0;offset<entries.length;offset+=100){const call=`SELECT public.register_pilot_geometry_batch(${quote(JSON.stringify(entries.slice(offset,offset+100)))}::jsonb);\n`;bulk+=call;await writeFile(`work/suburb-import/sql/${String(offset/100).padStart(3,'0')}.sql`,call);}
bulk+=`DO $$ BEGIN IF (SELECT count(*) FROM public.pilot_street_side)<>${all.features.length} THEN RAISE EXCEPTION 'Incomplete street registration';END IF;END;$$;\nCOMMIT;\n`;
await writeFile('supabase/migrations/012_suburb_street_sides.sql',bulk);
console.log(JSON.stringify({segments:entries.length,batches:Math.ceil(entries.length/100),sides:all.features.length}));
