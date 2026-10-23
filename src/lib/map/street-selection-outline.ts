import type {StreetSide} from './street-index';
import {reviewOutline} from './review-outline';
/** One shared tile viewport; never join separate road sections with invented connecting lines. */
export function streetSelectionOutline(sections:readonly StreetSide[],focus:readonly StreetSide[]=sections){
 const points=(focus.length?focus:sections).flatMap(side=>side.geometry.coordinates),outline=reviewOutline(points,'left');
 const world=(p:number[])=>[256*(p[0]+180)/360*2**outline.zoom,256*(1-Math.asinh(Math.tan(p[1]*Math.PI/180))/Math.PI)/2*2**outline.zoom];
 const first=world(points[0]),origin=[first[0]-outline.centre[0][0],first[1]-outline.centre[0][1]];
 const lines=sections.map(side=>{const centre=side.geometry.coordinates.map(p=>{const w=world(p);return [w[0]-origin[0],w[1]-origin[1]];});
  const points=centre.map((p,i)=>{const a=centre[Math.max(0,i-1)],b=centre[Math.min(centre.length-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)||1,distance=side.properties.side==='left'?8:-8;return [p[0]+dy/length*distance,p[1]-dx/length*distance];});
  return {id:side.id,points};
 });return {tiles:outline.tiles,lines};
}
