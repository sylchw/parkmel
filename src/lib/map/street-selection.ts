import type {StreetSide} from './street-index';
import type {ParkingSchedule} from '../../domain/parking/types';
export const MAX_STREET_SELECTION=100;
const name=(side:StreetSide)=>side.properties.name.trim().toLocaleLowerCase('en-AU');
export function matchingStreetSections(anchor:StreetSide,sections:readonly StreetSide[]):StreetSide[]{
 const street=name(anchor);
 if(!street||street==='unnamed road')return [anchor];
 return sections.filter(side=>name(side)===street).sort((a,b)=>a.properties.startDescription.localeCompare(b.properties.startDescription,'en-AU')||a.properties.side.localeCompare(b.properties.side)||a.id.localeCompare(b.id));
}
export function streetSelectionError(anchor:StreetSide,ids:unknown,lookup:(id:unknown)=>StreetSide|undefined):string|null {
 if(!Array.isArray(ids)||!ids.length||ids.length>MAX_STREET_SELECTION||ids.some(id=>typeof id!=='string')||new Set(ids).size!==ids.length||!ids.includes(anchor.id))return `Choose the original section and up to ${MAX_STREET_SELECTION} distinct street sides.`;
 if(ids.length>1&&(!name(anchor)||name(anchor)==='unnamed road'))return 'Select unnamed roads individually.';
 if(ids.some(id=>{const side=lookup(id);return !side||name(side)!==name(anchor);}))return 'All selected sections must be registered sides of the same named street.';
 return null;
}
export function hasLocalExtent(schedule:unknown):boolean {
 const rules=(schedule as ParkingSchedule|null)?.rules;
 return Array.isArray(rules)&&rules.some(rule=>rule.extent&&(rule.extent.start!==0||rule.extent.end!==1));
}
