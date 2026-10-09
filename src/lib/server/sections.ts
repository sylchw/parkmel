import {signedRuleSummaries} from "../map/signed-rule-summary";
import {sliceStreetLine} from "../map/street-geometry";
import {parkingDisplay} from "../map/parking-display";
import {createClient} from "@supabase/supabase-js";
import {evaluateStay,evaluationResult} from "../../domain/parking/evaluate";
import {validateParkingSchedule,validateParkingStay} from "../../domain/parking/validation";
import {MELBOURNE_HOLIDAYS_2026} from "../../domain/parking/holidays";
import type {ParkingSchedule,ParkingStay} from "../../domain/parking/types";
export function sectionService() {
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url || !key) throw new Error("Section service unavailable");
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
}
export function parseSectionQuery(params:URLSearchParams,protectedSession:boolean,now:Date) {
 const keys=["west","south","east","north"];
 const bounds=keys.map(key=>{const text=params.get(key);return text!==null && text.trim()!==""?Number(text):NaN;});
 const [west,south,east,north]=bounds;
 if(!bounds.every(Number.isFinite) || west< -180 || east>180 || south< -90 || north>90 || west>=east || south>=north) throw new RangeError("Invalid map bounds");
 // Conservative upper bound: longitude length at equator, rounded above WGS84 maxima.
 if((east-west)*112000*(north-south)*112000>2000000) throw new RangeError("Narrow the map area");
 if(!protectedSession && ["arrival","departure","includeUnknown"].some(key=>params.has(key))) throw new RangeError("Sign in to customize a stay");
 const stay={arrival:protectedSession?params.get("arrival")??"":now.toISOString(),
 departure:protectedSession?params.get("departure")??"":new Date(now.getTime()+15*60000).toISOString()};
 if(!validateParkingStay(stay).valid || Date.parse(stay.departure)-Date.parse(stay.arrival)>31*86400000) throw new RangeError("Invalid or unsupported stay");
 if(params.has("includeUnknown") && !["true","false"].includes(params.get("includeUnknown")!)) throw new RangeError("Invalid filter");
 return {west,south,east,north,stay,includeUnknown:protectedSession && params.get("includeUnknown")==="true"};
}
const object=(value:unknown):value is Record<string,unknown>=>!!value && typeof value==="object" && !Array.isArray(value);
export function evaluatedSections(payload:unknown,stay:ParkingStay,evaluatedAt:string,includeUnknown=false) {
 if(!object(payload) || !Array.isArray(payload.sections) || payload.sections.length>1000) throw new Error("Invalid section projection");
 const sections=payload.sections.flatMap(row=>{
  if(!object(row) || typeof row.sectionId!=="string" || !Number.isSafeInteger(row.geometryVersion) ||
   !["left","right"].includes(String(row.side)) || !object(row.geometry) || row.geometry.type!=="LineString" ||
   !Array.isArray(row.geometry.coordinates) || row.geometry.coordinates.length<2 ||
   row.geometry.coordinates.some(point=>!Array.isArray(point)||point.length!==2||!point.every(Number.isFinite)||Math.abs(point[0])>180||Math.abs(point[1])>90)) return [];
  const valid=validateParkingSchedule(row.schedule).valid && object(row.schedule) && row.schedule.sectionId===row.sectionId && row.schedule.geometryVersion===row.geometryVersion;
  const schedule=valid?row.schedule as unknown as ParkingSchedule:null;
  const coordinates=row.geometry.coordinates as number[][];
  const context={stay,evaluatedAt,timezone:"Australia/Melbourne" as const,vehicleContext:"ordinary_no_permit" as const,publicHolidays:[...MELBOURNE_HOLIDAYS_2026.dates]};
  const original=schedule?evaluateStay({...context,schedule},MELBOURNE_HOLIDAYS_2026):evaluationResult("unknown","incomplete_schedule","Published schedule unavailable");
  const safe=schedule&&!original.reasonCodes.some(code=>["invalid_input","unverified","stale","change_reported"].includes(code));
  const general=schedule?{...schedule,rules:schedule.rules.filter(rule=>!rule.extent||rule.extent.start===0&&rule.extent.end===1)}:null;
  const patches=safe?schedule!.rules.filter(rule=>rule.extent&&!(rule.extent.start===0&&rule.extent.end===1)).map(rule=>{
   const local={...schedule!,rules:[rule]},result=evaluateStay({...context,schedule:local},MELBOURNE_HOLIDAYS_2026);
   return {extent:rule.extent!,parkingDisplay:parkingDisplay(local,result),geometry:{type:"LineString",coordinates:sliceStreetLine(coordinates,rule.extent!.start,rule.extent!.end)},explanation:result.explanation,signedRules:signedRuleSummaries([rule],stay)};
  }).filter(zone=>zone.parkingDisplay.category!=="unknown"):[];
  const intervals=patches.map(zone=>zone.extent).sort((a,b)=>a.start-b.start);let covered=0;for(const interval of intervals){if(interval.start>covered)break;covered=Math.max(covered,interval.end);}
  const result=safe&&general&&covered<1?evaluateStay({...context,schedule:general},MELBOURNE_HOLIDAYS_2026):covered>=1?evaluationResult("restricted","prohibited","Local restrictions cover the entire side"):original;
  if(result.eligibility==="unknown" && !includeUnknown) return [];
  const text=(key:string)=>typeof row[key]==="string"?row[key] as string:"Unknown";
  // Explicit public fields: no source identifiers, rule IDs, references or raw schedule.
  return [{sectionId:row.sectionId,geometryVersion:row.geometryVersion as number,streetName:text("streetName"),side:row.side as "left"|"right",
   startDescription:text("startDescription"),endDescription:text("endDescription"),geometry:{type:"LineString",coordinates:row.geometry.coordinates},
   eligibility:result.eligibility,reasonCodes:result.reasonCodes,explanation:result.explanation,earliestTransition:result.earliestTransition,
   signedRules:safe&&general?signedRuleSummaries(general.rules,stay):[],
   parkingDisplay:parkingDisplay(general,result),...(patches.length?{localZones:patches}:{}),
   confidenceLevel:schedule?.confidenceLevel??null,lastVerifiedAt:schedule?.lastVerifiedAt??null,
   sourceDates:schedule?.rules.map(rule=>({observedAt:rule.source.observedAt,sourceDate:rule.source.sourceDate,evidenceKind:rule.source.evidenceKind}))??[]}];
 });
 return {sections,truncated:payload.truncated===true,message:payload.truncated===true?"Results capped; narrow the area":sections.length?null:"No matching verified parking sections",stay};
}
