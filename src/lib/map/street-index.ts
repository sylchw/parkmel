export interface StreetSide {id:string;properties:{sectionId:string;segmentId:string;geometryVersion:number;name:string;side:"left"|"right";startDescription:string;endDescription:string;direction:string};geometry:{type:string;coordinates:number[][]}}
export function searchStreetSides(sections:readonly StreetSide[],query:string):StreetSide[]{const value=query.trim().toLocaleLowerCase("en-AU");return value?sections.filter(section=>section.properties.name.toLocaleLowerCase("en-AU").includes(value)):[];}
export function sectionCenter(section:StreetSide):[number,number]{const points=section.geometry.coordinates;const first=points[0],last=points[points.length-1];return [(first[0]+last[0])/2,(first[1]+last[1])/2];}

export interface StreetSearchResult {name:string;center:[number,number]}
/** Search locates a street's general area; a side is chosen separately on the map. */
export function searchStreets(sections:readonly StreetSide[],query:string):StreetSearchResult[]{
 const matches=searchStreetSides(sections,query),streets=new Map<string,{name:string;west:number;east:number;south:number;north:number}>();
 for(const section of matches){const name=section.properties.name.trim(),key=name.toLocaleLowerCase("en-AU");
  const bounds=streets.get(key)??{name,west:Infinity,east:-Infinity,south:Infinity,north:-Infinity};
  for(const [longitude,latitude] of section.geometry.coordinates){bounds.west=Math.min(bounds.west,longitude);bounds.east=Math.max(bounds.east,longitude);bounds.south=Math.min(bounds.south,latitude);bounds.north=Math.max(bounds.north,latitude);}
  streets.set(key,bounds);
 }
 return [...streets.values()].sort((a,b)=>a.name.localeCompare(b.name,"en-AU")).map(street=>({name:street.name,center:[(street.west+street.east)/2,(street.south+street.north)/2]}));
}
