import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const legacy=JSON.parse(await readFile('public/carnegie-sections.json','utf8'));
const oldRoads=JSON.parse(await readFile('public/carnegie-streets.geojson','utf8')).features;
const incoming=JSON.parse(await readFile('work/suburb-import/roads.json','utf8')).features;
const metadata=JSON.parse(await readFile('work/suburb-import/boundaries.json','utf8'));
const existing=JSON.parse(await readFile('data/coverage-sections.json','utf8'));
const oldIds=new Set(existing.features.map(feature=>feature.properties.osmWayId));
const newRoads=incoming.filter(road=>!oldIds.has(road.properties.osmWayId));
const legacyWayIds=new Set(oldRoads.map(road=>road.properties.osmWayId));
const roads=[...oldRoads,...incoming.filter(road=>!legacyWayIds.has(road.properties.osmWayId))],key=p=>p.join(','),touching=new Map();
for(const road of roads)for(const point of road.geometry.coordinates){const names=touching.get(key(point))??new Map();names.set(road.id,road.properties.name);touching.set(key(point),names);}
const uuid=value=>{const h=createHash('sha256').update(value).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
const additions=[];
for(const road of newRoads){const points=road.geometry.coordinates;let start=0;
 for(let end=1;end<points.length;end++){
  if(end!==points.length-1&&touching.get(key(points[end])).size<2)continue;
  const coordinates=points.slice(start,end+1);start=end;if(new Set(coordinates.map(key)).size<2)continue;
  const describe=point=>{const other=[...touching.get(key(point)).values()].filter(name=>name!==road.properties.name&&name!=='Unnamed road');return other.length?`Junction with ${[...new Set(other)].join(' / ')}`:`Road boundary at ${point[1]}, ${point[0]}`;};
  const segmentId=uuid(`${road.id}:${key(coordinates[0])}:${key(coordinates.at(-1))}`);
  for(const side of ['left','right']){const id=uuid(`${segmentId}:${side}`);additions.push({type:'Feature',id,properties:{sectionId:id,segmentId,geometryVersion:1,name:road.properties.name,side,startDescription:describe(coordinates[0]),endDescription:describe(coordinates.at(-1)),direction:'Left/right looking from the start boundary towards the end boundary',osmWayId:road.properties.osmWayId},geometry:{type:'LineString',coordinates}});}
 }
}
const all=[...existing.features,...additions];if(new Set(all.map(feature=>feature.id)).size!==all.length)throw new Error('Duplicate section identity');
await mkdir('public/coverage',{recursive:true});await mkdir('data',{recursive:true});
const manifest=[{id:'carnegie',name:'Carnegie',center:[145.056,-37.886],bounds:[145.03,-37.91,145.10,-37.86],geometry:null,url:'/carnegie-sections.json',sides:legacy.features.length}];
for(const suburb of metadata.suburbs){const wayIds=new Set(incoming.filter(road=>road.properties.suburbs.includes(suburb.name)).map(road=>road.properties.osmWayId));const features=all.filter(feature=>wayIds.has(feature.properties.osmWayId));const id=suburb.name.toLowerCase().replaceAll(' ','-');await writeFile(`public/coverage/${id}.json`,JSON.stringify({type:'FeatureCollection',features})+'\n');manifest.push({...suburb,id,url:`/coverage/${id}.json`,sides:features.length});}
await writeFile('public/coverage/manifest.json',JSON.stringify({source:metadata.source,sha256:metadata.sha256,suburbs:manifest})+'\n');
await writeFile('data/coverage-sections.json',JSON.stringify({type:'FeatureCollection',features:all})+'\n');
console.log(JSON.stringify({preservedCarnegie:legacy.features.length,addedSides:additions.length,totalSides:all.length,suburbs:manifest.map(({name,sides})=>({name,sides}))}));
