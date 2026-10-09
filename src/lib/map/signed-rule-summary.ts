import {displayTime} from '../../domain/parking/display-time';
import {instantToMelbourneLocal} from '../../domain/parking/time';
import {ruleAppliesOnDate,MELBOURNE_HOLIDAYS_2026} from '../../domain/parking/holidays';
import type {ParkingRule,ParkingStay} from '../../domain/parking/types';
export interface SignedRuleSummary {label:string;active:boolean|null}
const dayNames=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
function daysLabel(days:number[]):string {
 const ordered=[1,2,3,4,5,6,0].filter(day=>days.includes(day));
 if(ordered.length===7)return 'Every day';
 const groups:string[]=[];
 for(let i=0;i<ordered.length;i++){let end=i;while(end+1<ordered.length&&([1,2,3,4,5,6,0].indexOf(ordered[end+1])===[1,2,3,4,5,6,0].indexOf(ordered[end])+1))end++;groups.push(end>i?`${dayNames[ordered[i]]}–${dayNames[ordered[end]]}`:dayNames[ordered[i]]);i=end;}
 return `${groups.join(', ')} only`;
}
function appliesDuring(rule:ParkingRule,stay:ParkingStay):boolean|null {
 const start=instantToMelbourneLocal(new Date(stay.arrival)),end=instantToMelbourneLocal(new Date(stay.departure));
 if(Date.parse(`${end}Z`)-Date.parse(`${start}Z`)!==Math.floor(Date.parse(stay.departure)/1000)*1000-Math.floor(Date.parse(stay.arrival)/1000)*1000)return null;
 const first=Date.parse(`${start.slice(0,10)}T00:00:00Z`),last=Date.parse(`${end.slice(0,10)}T00:00:00Z`);
 const minute=(s:string)=>Number(s.slice(11,13))*60+Number(s.slice(14,16))+Number(s.slice(17,19))/60;
 let uncertain=false;
 for(let date=first;date<=last;date+=86400000){
  const from=date===first?minute(start):0,through=date===last?minute(end):1440;
  if(!rule.periods.some(p=>p.dayOfWeek===new Date(date).getUTCDay()&&p.startTime<through&&p.endTime>from))continue;
  const applies=ruleAppliesOnDate(rule,new Date(date).toISOString().slice(0,10),MELBOURNE_HOLIDAYS_2026);
  if(applies===true)return true;if(applies===null)uncertain=true;
 }
 return uncertain?null:false;
}
export function signedRuleSummaries(rules:readonly ParkingRule[],stay:ParkingStay):SignedRuleSummary[] {
 const labels:Record<ParkingRule['type'],string>={free:'Free parking',time_limit:'Time limit',fee:'Metered / paid',clearway:'Clearway',permit:'Permit only',loading:'Loading zone',accessible:'Accessible parking',no_parking:'No parking',no_stopping:'No stopping',towaway:'Tow-away',conditional:'Conditional parking',unknown:'Unknown rule'};
 return rules.map(rule=>{
  const groups=new Map<string,number[]>();
  for(const period of rule.periods){const key=`${period.startTime}:${period.endTime}`;groups.set(key,[...(groups.get(key)??[]),period.dayOfWeek]);}
  const times=[...groups].map(([key,days])=>{const [from,to]=key.split(':').map(Number);return `${daysLabel(days)}${from===0&&to===1440?'':` · ${displayTime(from)}–${displayTime(to)}`}`;}).join('; ');
  const limit=rule.maxDurationMinutes;
  const name=rule.type==='time_limit'&&limit?limit<60?`${limit} min`:`${limit/60}P`:labels[rule.type];
  return {label:`${name} · ${times}${rule.feeStatus==='paid'&&rule.type!=='fee'?' · metered / paid':''}${rule.holidayPolicy==='excluded'?' · except public holidays':''}`,active:appliesDuring(rule,stay)};
 });
}
