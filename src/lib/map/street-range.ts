import type {StreetSide} from './street-index';
import {MAX_STREET_SELECTION,matchingStreetSections} from './street-selection';

type EdgeSide=StreetSide['properties']['side'];
interface Segment {id:string;from:string;to:string;sides:Partial<Record<EdgeSide,StreetSide>>}
export interface StreetJunction {id:string;label:string;coordinates:number[]}
export interface StreetRangeModel {junctions:StreetJunction[];segments:Segment[]}
export type StreetRangeResult={ids:string[];sectionCount:number;error:null}|{ids:[];sectionCount:0;error:string};
/** Match shared OSM endpoints exactly. Never snap nearby carriageways or infer a crossing. */
export const streetJunctionId=(point:readonly number[])=>JSON.stringify(point.slice(0,2));
const opposite=(side:EdgeSide):EdgeSide=>side==='left'?'right':'left';
export function streetRangeModel(sections:readonly StreetSide[]):StreetRangeModel {
 const nodes=new Map<string,{coordinates:number[];labels:Set<string>}>(),segments=new Map<string,Segment>();
 for(const side of sections){
  const points=side.geometry.coordinates,first=points[0],last=points.at(-1);
  if(!first||!last)continue;
  const from=streetJunctionId(first),to=streetJunctionId(last);
  for(const [id,coordinates,label] of [[from,first,side.properties.startDescription],[to,last,side.properties.endDescription]] as const){
   const node=nodes.get(id)??{coordinates,labels:new Set<string>()};node.labels.add(label);nodes.set(id,node);
  }
  const segment=segments.get(side.properties.segmentId)??{id:side.properties.segmentId,from,to,sides:{}};
  segment.sides[side.properties.side]=side;segments.set(segment.id,segment);
 }
 const junctions=[...nodes].map(([id,node])=>({id,coordinates:node.coordinates,label:[...node.labels].sort((a,b)=>a.localeCompare(b,'en-AU')).join(' / ')})).sort((a,b)=>a.label.localeCompare(b.label,'en-AU')||a.id.localeCompare(b.id));
 return {junctions,segments:[...segments.values()]};
}
interface Step {segment:Segment;from:string;to:string}
/** A single, unambiguous connected stretch. Side orientation follows the route, not stored OSM direction. */
export function selectStreetRange(anchor:StreetSide,sections:readonly StreetSide[],from:string,to:string,bothSides:boolean):StreetRangeResult {
 const fail=(error:string):StreetRangeResult=>({ids:[],sectionCount:0,error});
 if(!from||!to||from===to)return fail('Choose two different junctions or boundaries.');
 const model=streetRangeModel(matchingStreetSections(anchor,sections)),adjacent=new Map<string,Step[]>();
 for(const segment of model.segments){
  for(const [a,b] of [[segment.from,segment.to],[segment.to,segment.from]]){const list=adjacent.get(a)??[];list.push({segment,from:a,to:b});adjacent.set(a,list);}
 }
 function path(start:string,end:string,omit?:string):Step[]|null {
  const queue=[start],previous=new Map<string,Step|null>([[start,null]]);
  for(let i=0;i<queue.length&&!previous.has(end);i++)for(const step of adjacent.get(queue[i])??[]){
   if(step.segment.id===omit||previous.has(step.to))continue;
   previous.set(step.to,step);queue.push(step.to);
  }
  if(!previous.has(end))return null;
  const result:Step[]=[];for(let node=end;node!==start;){const step=previous.get(node)!;result.push(step);node=step.from;}
  return result.reverse();
 }
 const route=path(from,to);
 if(!route)return fail('These boundaries are not connected along the loaded street. Choose closer boundaries or select sections manually.');
 // Every edge of a unique route must be a bridge. Cycles and parallel alternatives need a manual choice.
 if(route.some(step=>path(step.from,step.to,step.segment.id)!==null))return fail('More than one route connects these boundaries. Choose a shorter stretch or select the sections manually.');
 const source=route.find(step=>step.segment.id===anchor.properties.segmentId);
 if(!source)return fail('Include the original section in this range, or start a contribution on the stretch you want.');
 const routeSide=source.from===source.segment.from?anchor.properties.side:opposite(anchor.properties.side),ids:string[]=[];
 for(const step of route){
  const localSide=step.from===step.segment.from?routeSide:opposite(routeSide);
  for(const edge of bothSides?['left','right'] as const:[localSide]){
   const target=step.segment.sides[edge];
   if(!target)return fail('A required street side is missing. Select the available sides manually.');
   ids.push(target.id);
  }
 }
 if(ids.length>MAX_STREET_SELECTION)return fail(`This range has ${ids.length} street sides. Choose closer boundaries (up to ${MAX_STREET_SELECTION} per submission).`);
 return {ids,sectionCount:route.length,error:null};
}
