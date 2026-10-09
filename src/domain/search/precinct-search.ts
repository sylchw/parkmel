export interface CuratedDestination {
 id:string; name:string; aliases:readonly string[]; center:readonly [number,number]; synthetic:boolean;
}
export const SYNTHETIC_DESTINATIONS:readonly CuratedDestination[]=[{
 id:"fixture-precinct",name:"Invented demonstration precinct",aliases:["fixture","demo"],
 center:[145.056,-37.886],synthetic:true,
}];
export function searchPrecincts(query:string,destinations:readonly CuratedDestination[]) {
 const normalized=query.trim().normalize("NFKC").toLocaleLowerCase("en-AU");
 if(normalized.length<2 || normalized.length>100) throw new RangeError("Enter between 2 and 100 characters");
 const matches=destinations.filter(destination=>[destination.name,...destination.aliases]
  .some(value=>value.normalize("NFKC").toLocaleLowerCase("en-AU").includes(normalized)))
  .slice().sort((a,b)=>a.name.localeCompare(b.name,"en-AU") || a.id.localeCompare(b.id)).slice(0,20);
 return {destinations:matches.map(({id,name,center,synthetic})=>({id,name,center,synthetic,
  label:synthetic?`${name} · synthetic example`:name})),coverage:destinations.length?"curated_only":"empty",
  message:destinations.length?"Only supplied precincts are searchable. Results do not establish parking availability.":"No operator-supplied precinct coverage is available."};
}
