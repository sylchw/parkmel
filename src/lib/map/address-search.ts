export interface AddressResult {label:string;center:[number,number]}
export function houseNumber(query:string):string|null {return query.trim().match(/^(\d+[a-z]?(?:[-/]\d+[a-z]?)?)\s+\S/i)?.[1]??null;}
export function addressSearchUrl(query:string):string {
 const value=query.trim();if(!houseNumber(value)||value.length>100)throw new Error("Enter a street number and road name (up to 100 characters).");
 const url=new URL("https://photon.komoot.io/api/");
 url.search=new URLSearchParams({q:value,bbox:"144.4,-38.5,146,-37.3",lat:"-37.886",lon:"145.056",limit:"5",countrycode:"AU"}).toString();return url.href;
}
export function addressResults(payload:unknown,query:string):AddressResult[]{
 if(!payload||typeof payload!=="object"||!("features" in payload)||!Array.isArray(payload.features))throw new Error("Invalid address response");
 const number=houseNumber(query)?.toLowerCase(),seen=new Set<string>(),results:AddressResult[]=[];
 for(const feature of payload.features){
  const properties=feature?.properties,coordinates=feature?.geometry?.coordinates;
  if(feature?.geometry?.type!=="Point"||!Array.isArray(coordinates)||coordinates.length!==2||!coordinates.every(value=>typeof value==="number"&&Number.isFinite(value)))continue;
  const [longitude,latitude]=coordinates;
  if(longitude<144.4||longitude>146||latitude< -38.5||latitude> -37.3||properties?.countrycode?.toUpperCase()!=="AU")continue;
  if(typeof properties.housenumber!=="string"||properties.housenumber.toLowerCase()!==number||typeof properties.street!=="string")continue;
  const locality=[properties.district,properties.city].filter(value=>typeof value==="string"&&value.trim());
  const label=[`${properties.housenumber} ${properties.street}`,...new Set(locality)].join(", ");
  const key=`${label}:${longitude}:${latitude}`;if(seen.has(key))continue;seen.add(key);results.push({label,center:[longitude,latitude]});
 }
 return results.slice(0,5);
}
