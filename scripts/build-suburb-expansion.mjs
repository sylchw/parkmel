// Additive expansion; preserve every existing target and never regenerate applied migrations.
import {readFile,writeFile} from 'node:fs/promises';
const output=process.argv[3]??'016_malvern_east_oakleigh_south.sql';
const names=process.argv.slice(4).length?process.argv.slice(4):['Malvern East','Oakleigh South'];
if(!/^\d{3}_[a-z0-9_]+\.sql$/.test(output))throw new Error('Invalid migration filename');
const prior=JSON.parse(await readFile(process.argv[2],'utf8'));
const current=JSON.parse(await readFile('data/coverage-sections.json','utf8'));
const manifest=JSON.parse(await readFile('public/coverage/manifest.json','utf8'));
const byId=new Map(current.features.map(feature=>[feature.id,feature]));
for(const feature of prior.features)if(JSON.stringify(byId.get(feature.id))!==JSON.stringify(feature))throw new Error(`Existing side changed: ${feature.id}`);
const oldIds=new Set(prior.features.map(feature=>feature.id));
const pairs=new Map();for(const feature of current.features){if(oldIds.has(feature.id))continue;const item=pairs.get(feature.properties.segmentId)??{feature,sides:{}};item.sides[feature.properties.side]=feature.id;pairs.set(feature.properties.segmentId,item);}
const quote=value=>`'${value.replaceAll("'","''")}'`;
let sql='BEGIN;\n';
for(const name of names){const region=manifest.suburbs.find(r=>r.name===name);if(!region?.geometry)throw new Error(`Missing boundary: ${name}`);sql+=`INSERT INTO public.pilot_coverage_area(id,name,geom) VALUES(${quote(region.id)},${quote(name)},public.ST_SetSRID(public.ST_GeomFromGeoJSON(${quote(JSON.stringify(region.geometry))}),4326)) ON CONFLICT(id) DO NOTHING;\n`;}
const entries=[...pairs.values()].map(({feature:f,sides})=>{if(!sides.left||!sides.right)throw new Error('Missing side');return [sides.left,sides.right,f.properties.name,f.properties.startDescription,f.properties.endDescription,f.properties.direction,f.geometry.coordinates];});
for(let offset=0;offset<entries.length;offset+=100)sql+=`SELECT public.register_pilot_geometry_batch(${quote(JSON.stringify(entries.slice(offset,offset+100)))}::jsonb);\n`;
sql+=`DO $$ BEGIN IF (SELECT count(*) FROM public.pilot_street_side)<>${current.features.length} THEN RAISE EXCEPTION 'Incomplete expansion';END IF;END;$$;\nCOMMIT;\n`;
await writeFile(`supabase/migrations/${output}`,sql);
console.log(JSON.stringify({preserved:prior.features.length,addedSides:current.features.length-prior.features.length,totalSides:current.features.length,batches:Math.ceil(entries.length/100),suburbs:manifest.suburbs.filter(r=>names.includes(r.name)).map(r=>({name:r.name,sides:r.sides}))}));
