import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import type {StreetSide} from '../../src/lib/map/street-index';
import {selectStreetRange,streetJunctionId,streetRangeModel} from '../../src/lib/map/street-range';
import {streetSelectionOutline} from '../../src/lib/map/street-selection-outline';
const node=(x:number)=>[145+x/10000,-38];
const id=(x:number)=>streetJunctionId(node(x));
function segment(key:string,from:number,to:number,name='Test Road'):StreetSide[]{return (['left','right'] as const).map(side=>({id:`${key}-${side}`,properties:{sectionId:`${key}-${side}`,segmentId:key,geometryVersion:1,name,side,startDescription:`Junction ${from}`,endDescription:`Junction ${to}`,direction:'Start to end'},geometry:{type:'LineString',coordinates:[node(from),node(to)]}}));}
const a=segment('a',0,1),b=segment('b',2,1),c=segment('c',2,3),road=[...a,...b,...c];
it('groups both sides at each actual endpoint rather than joining matching descriptions',()=>{
 const elsewhere=segment('d',10,11);elsewhere.forEach(s=>{s.properties.startDescription='Junction 1';});
 const model=streetRangeModel([...road,...elsewhere]);expect(model.segments).toHaveLength(4);expect(model.junctions).toHaveLength(6);
 expect(selectStreetRange(a[0],[...road,...elsewhere],id(0),id(11),false).error).toMatch(/not connected/);
});
it('selects a continuous physical side through reversed geometry, independent of chosen travel direction',()=>{
 const forward=selectStreetRange(a[0],road,id(0),id(3),false),reverse=selectStreetRange(a[0],road,id(3),id(0),false);
 expect(forward).toEqual({ids:['a-left','b-right','c-left'],sectionCount:3,error:null});expect(reverse.ids).toEqual([...forward.ids].reverse());
 expect(selectStreetRange(b[0],road,id(0),id(3),false).ids).toEqual(['a-right','b-left','c-right']);
 expect(selectStreetRange(a[0],road,id(0),id(3),true).ids).toEqual(['a-left','a-right','b-left','b-right','c-left','c-right']);
});
it('rejects equal, unknown or disconnected boundaries and ranges that omit the source',()=>{
 expect(selectStreetRange(a[0],road,id(0),id(0),false).error).toMatch(/different/);
 expect(selectStreetRange(a[0],road,id(0),id(99),false).error).toMatch(/not connected/);
 expect(selectStreetRange(a[0],road,id(1),id(3),false).error).toMatch(/original section/);
});
it('does not guess between alternative routes or parallel segments',()=>{
 expect(selectStreetRange(a[0],[...road,...segment('detour',1,3)],id(0),id(3),true).error).toMatch(/More than one route/);
 expect(selectStreetRange(a[0],[...road,...segment('parallel',0,1)],id(0),id(1),true).error).toMatch(/More than one route/);
 // A cycle or branch off the chosen stretch does not make that stretch ambiguous.
 expect(selectStreetRange(a[0],[...road,...segment('branch',1,9),...segment('cycle1',9,10),...segment('cycle2',10,11),...segment('cycle3',11,9)],id(0),id(3),false).error).toBeNull();
});
it('never connects nearby divided carriageways or a crossing in the middle of a segment',()=>{
 const parallel=segment('parallel',0,1);for(const s of parallel)s.geometry.coordinates=s.geometry.coordinates.map(p=>[p[0],p[1]+.00001]);
 const key=streetJunctionId(parallel[0].geometry.coordinates[1]);expect(selectStreetRange(a[0],[...road,...parallel],id(0),key,true).error).toMatch(/not connected/);
 const crossing=segment('crossing',20,21);for(const s of crossing)s.geometry.coordinates=[[145.00005,-38.001],[145.00005,-37.999]];
 expect(selectStreetRange(a[0],[...road,...crossing],id(0),streetJunctionId(crossing[0].geometry.coordinates[1]),false).error).toMatch(/not connected/);
});
it('excludes other street names and reports missing sides instead of silently narrowing a range',()=>{
 expect(selectStreetRange(a[0],[...a,...segment('other',1,2,'Other Road')],id(0),id(2),true).error).toMatch(/not connected/);
 expect(selectStreetRange(a[0],[...a,b[0]],id(0),id(2),false).error).toMatch(/side is missing/);
 expect(selectStreetRange(a[0],[a[0]],id(0),id(1),true).error).toMatch(/side is missing/);
});
it('allows exactly 100 sides and rejects oversized ranges without truncating',()=>{
 const long=Array.from({length:101},(_,i)=>segment(String(i),i,i+1)).flat();
 expect(selectStreetRange(long[0],long,id(0),id(50),true).ids).toHaveLength(100);
 expect(selectStreetRange(long[0],long,id(0),id(51),true).error).toMatch(/102 street sides/);
 expect(selectStreetRange(long[0],long,id(0),id(100),false).ids).toHaveLength(100);
 expect(selectStreetRange(long[0],long,id(0),id(101),false).error).toMatch(/101 street sides/);
});
it('keeps all lines separate while refitting tiles around the chosen stretch',()=>{
 const distant=segment('far',1000,1001),all=[...road,...distant];
 const full=streetSelectionOutline(all),focused=streetSelectionOutline(all,a);
 expect(focused.lines).toHaveLength(all.length);expect(focused.tiles.length).toBeLessThanOrEqual(6);expect(focused.tiles[0].url).not.toEqual(full.tiles[0].url);
 for(const p of focused.lines[0].points){expect(p[0]).toBeGreaterThan(0);expect(p[0]).toBeLessThan(380);expect(p[1]).toBeGreaterThan(0);expect(p[1]).toBeLessThan(220);}
 expect(focused.lines.at(-1)!.points[0][0]).toBeGreaterThan(380);
});
it('can choose a short unambiguous range on the imported Dandenong Road without selecting its 116 sides',()=>{
 const {features}=JSON.parse(readFileSync('public/carnegie-sections.json','utf8')) as {features:StreetSide[]};
 const street=features.filter(s=>s.properties.name==='Dandenong Road');expect(street).toHaveLength(116);
 const start=street.find(s=>s.properties.startDescription==='Junction with Repton Road'&&s.properties.endDescription==='Junction with Wilmot Street')!;
 const result=selectStreetRange(start,street,streetJunctionId(start.geometry.coordinates[0]),streetJunctionId(start.geometry.coordinates.at(-1)!),true);
 expect(result.error).toBeNull();expect(result.ids).toHaveLength(2);expect(result.ids).toContain(start.id);
});
