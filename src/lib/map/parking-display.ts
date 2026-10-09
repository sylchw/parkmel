import type {EvaluationResult,ParkingSchedule} from "../../domain/parking/types";
export const PARKING_COLOURS={short:"#b8860b",one_hour:"#d95f02",medium:"#00857a",long:"#2563eb",untimed:"#087f5b",permit:"#7c3aed",prohibited:"#b42318",special:"#795548",unknown:"#64748b"} as const;
export type ParkingCategory=keyof typeof PARKING_COLOURS;
export const PARKING_LABELS:Record<ParkingCategory,string>={short:"Below 1P",one_hour:"1P–under 2P",medium:"2P–under 4P",long:"4P and above",untimed:"No signed time limit",permit:"Permit only",prohibited:"No parking / no stopping / clearway",special:"Loading / accessible only",unknown:"Unknown"};
export const PAID_COLOUR="#c0268c";
export interface ParkingDisplay {category:ParkingCategory;payment:"free"|"paid"|"unknown";maxDurationMinutes:number|null;stayExceeded:boolean;zoneLabel?:string}
const unknown=():ParkingDisplay=>({category:"unknown",payment:"unknown",maxDurationMinutes:null,stayExceeded:false});
/** Use only rules identified by the trusted stay evaluator, never sign-text guesses. */
export function parkingDisplay(schedule:ParkingSchedule|null,result:EvaluationResult):ParkingDisplay {
 if(!schedule || (result.eligibility==="unknown" && !result.reasonCodes.every(reason=>reason==="unknown_fee")))return unknown();
 const active=schedule.rules.filter(rule=>result.appliedRuleIds.includes(rule.id));
 if(!active.length)return result.eligibility==="eligible_free"&&result.reasonCodes.includes("outside_signed_hours")?{category:"untimed",payment:"free",maxDurationMinutes:null,stayExceeded:false}:unknown();
 const limits=active.flatMap(rule=>rule.maxDurationMinutes===undefined?[]:[rule.maxDurationMinutes]);
 const maximum=limits.length?Math.min(...limits):null;
 const payment=active.some(rule=>rule.feeStatus==="paid")?"paid":active.every(rule=>rule.feeStatus==="free")?"free":"unknown";
 let category:ParkingCategory;
 if(active.some(rule=>["no_parking","no_stopping","towaway","clearway"].includes(rule.type)))category="prohibited";
 else if(active.some(rule=>rule.type==="permit"||rule.permitCondition==="required"))category="permit";
 else if(active.some(rule=>rule.type==="loading"||rule.type==="accessible"))category="special";
 else if(maximum!==null)category=maximum<60?"short":maximum<120?"one_hour":maximum<240?"medium":"long";
 else category="untimed";
 const zoneNames:Record<string,string>={no_parking:"No parking",no_stopping:"No stopping",towaway:"Tow-away",clearway:"Clearway",loading:"Loading zone",accessible:"Accessible parking only"};
 const zoneLabel=["prohibited","special"].includes(category)?[...new Set(active.flatMap(rule=>zoneNames[rule.type]?[zoneNames[rule.type]]:[]))].join(" / "):undefined;
 return {category,payment,maxDurationMinutes:maximum,...(zoneLabel?{zoneLabel}:{}),stayExceeded:result.reasonCodes.includes("duration_exceeded")};
}
export function parkingDisplayLabel(display:ParkingDisplay):string {
 const limit=display.maxDurationMinutes===null?PARKING_LABELS[display.category]:display.maxDurationMinutes%60===0?`${display.maxDurationMinutes/60}P (${display.maxDurationMinutes/60} ${display.maxDurationMinutes===60?"hour":"hours"} maximum)`:`${display.maxDurationMinutes} minutes maximum`;
 const category=["permit","prohibited","special","unknown"].includes(display.category)?display.zoneLabel??PARKING_LABELS[display.category]:limit;
 const zoneLimit=display.category==="special"&&display.maxDurationMinutes!==null?` · ${limit}`:"";
 return `${category}${zoneLimit} · ${display.payment==="paid"?"Metered / paid":display.payment==="free"?"No fee recorded":"Payment unknown"}${display.stayExceeded?" · Selected stay exceeds time limit":""}`;
}
