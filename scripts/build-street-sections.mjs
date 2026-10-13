import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const roads=JSON.parse(await readFile('public/carnegie-streets.geojson','utf8'));
const key=p=>p.join(',');
const touching=new Map();
for(const road of roads.features)for(const p of road.geometry.coordinates){const names=touching.get(key(p))??new Map();names.set(road.id,road.properties.name);touching.set(key(p),names);}
const uuid=value=>{const h=createHash('sha256').update(value).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
const features=[];
for(const road of roads.features){
 const points=road.geometry.coordinates;let start=0;
 for(let end=1;end<points.length;end++){
  if(end!==points.length-1&&touching.get(key(points[end])).size<2)continue;
  const coords=points.slice(start,end+1);
  const describe=p=>{const other=[...touching.get(key(p)).values()].filter(name=>name!==road.properties.name&&name!=='Unnamed road');return other.length?`Junction with ${[...new Set(other)].join(' / ')}`:`Road boundary at ${p[1]}, ${p[0]}`;};
  const segmentId=uuid(`${road.id}:${key(coords[0])}:${key(coords.at(-1))}`);
  for(const side of ['left','right'])features.push({type:'Feature',id:uuid(`${segmentId}:${side}`),properties:{sectionId:uuid(`${segmentId}:${side}`),segmentId,geometryVersion:1,name:road.properties.name,side,startDescription:describe(coords[0]),endDescription:describe(coords.at(-1)),direction:'Left/right looking from the start boundary towards the end boundary',osmWayId:road.properties.osmWayId},geometry:{type:'LineString',coordinates:coords}});
  start=end;
 }
}
await writeFile('public/carnegie-sections.json',JSON.stringify({type:'FeatureCollection',features})+'\n');
console.log(`${features.length} street sides split at shared road junctions`);
