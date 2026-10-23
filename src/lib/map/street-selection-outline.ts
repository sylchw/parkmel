import type {StreetSide} from './street-index';
import {reviewOutline} from './review-outline';
/** One shared tile viewport; never join separate road sections with invented connecting lines. */
export function streetSelectionOutline(sections:readonly StreetSide[]){
 const outline=reviewOutline(sections.flatMap(side=>side.geometry.coordinates),'left');let offset=0;
 const lines=sections.map(side=>{const centre=outline.centre.slice(offset,offset+side.geometry.coordinates.length);offset+=centre.length;
  const points=centre.map((p,i)=>{const a=centre[Math.max(0,i-1)],b=centre[Math.min(centre.length-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)||1,distance=side.properties.side==='left'?8:-8;return [p[0]+dy/length*distance,p[1]-dx/length*distance];});
  return {id:side.id,points};
 });return {tiles:outline.tiles,lines};
}
