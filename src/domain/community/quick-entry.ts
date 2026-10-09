import {displayPeriod} from "../parking/display-time";
import type {AnnotationDraft} from './draft';
import type {ParkingRule,ParkingSchedule,RuleType,TimePeriod} from '../parking/types';
import {interpretHolidayPolicy} from '../parking/holidays';
export interface QuickRow {id:string;kind:'parking'|'condition';value:string;days:number[];daysSpecified?:boolean;holidaysApply?:boolean;allDay:boolean;start:string;end:string;paid:boolean;fee:string;local:boolean;from:number;to:number}
export interface QuickEntry {version:1;rows:QuickRow[];holidaysApply:boolean}
export const DAYS=[{day:1,name:'Monday'},{day:2,name:'Tuesday'},{day:3,name:'Wednesday'},{day:4,name:'Thursday'},{day:5,name:'Friday'},{day:6,name:'Saturday'},{day:0,name:'Sunday'}];
export const CONDITION_LABELS:Record<string,string>={towaway:'Tow-away',clearway:'Clearway',no_stopping:'No stopping',no_parking:'No parking',permit:'Permit only',loading:'Loading only',accessible:'Accessible parking only'};
/** Bare numbers and P notation are hours; explicit minute units are minutes. */
export function quickLimitMinutes(text:string):number|null {
 const value=text.trim();
 const minuteMatch=value.match(/^(\d+)\s*(?:m|min|mins|minute|minutes)$/i);
 const hoursMatch=value.match(/^(\d+(?:\.\d+)?|\d+\/\d+)\s*p?$/i);
 let result:number;
 if(minuteMatch)result=Number(minuteMatch[1]);
 else if(hoursMatch){const parts=hoursMatch[1].split('/');result=(parts.length===2?Number(parts[0])/Number(parts[1]):Number(parts[0]))*60;}
 else return null;
 return Number.isSafeInteger(result)&&result>0&&result<=1440?result:null;
}
export function newQuickRow(kind:QuickRow['kind'],id:string,existing:readonly QuickRow[]=[]):QuickRow{const covered=new Set(existing.filter(row=>row.kind==='parking').flatMap(row=>row.daysSpecified===false?DAYS.map(day=>day.day):row.days));return {id,kind,value:kind==='parking'?'':'towaway',days:DAYS.map(d=>d.day).filter(day=>kind!=='parking'||!covered.has(day)),daysSpecified:true,holidaysApply:false,allDay:true,start:'08:00',end:'18:00',paid:false,fee:'',local:false,from:0,to:10};}
export function updateQuickRow(row:QuickRow,change:Partial<QuickRow>):QuickRow{
 const next={...row,...change};
 if(change.days!==undefined||change.daysSpecified!==undefined){next.daysSpecified=change.daysSpecified??true;if(next.daysSpecified===false)next.days=DAYS.map(d=>d.day);next.holidaysApply=interpretHolidayPolicy(next.daysSpecified?'named':'none')==='applies';}
 return next;
}
const minutes=(text:string)=>/^\d{2}:\d{2}$/.test(text)&&Number(text.slice(0,2))<24&&Number(text.slice(3))<60?Number(text.slice(0,2))*60+Number(text.slice(3)):NaN;
export function quickPeriods(row:QuickRow):TimePeriod[]{
 const days=[...new Set(row.daysSpecified===false?DAYS.map(day=>day.day):row.days)].filter(day=>Number.isInteger(day)&&day>=0&&day<=6);if(row.allDay)return days.map(dayOfWeek=>({dayOfWeek,startTime:0,endTime:1440}));
 const start=minutes(row.start),end=minutes(row.end);if(!Number.isFinite(start)||!Number.isFinite(end)||start===end)return [];
 return days.flatMap(dayOfWeek=>end===0||end>start?[{dayOfWeek,startTime:start,endTime:end||1440}]:[{dayOfWeek,startTime:start,endTime:1440},{dayOfWeek:(dayOfWeek+1)%7,startTime:0,endTime:end}]);
}
const overlaps=(a:TimePeriod,b:TimePeriod)=>a.dayOfWeek===b.dayOfWeek&&a.startTime<b.endTime&&b.startTime<a.endTime;
function subtract(periods:TimePeriod[],cuts:TimePeriod[]):TimePeriod[]{return cuts.reduce((remaining,cut)=>remaining.flatMap(p=>!overlaps(p,cut)?[p]:[...(p.startTime<cut.startTime?[{...p,endTime:cut.startTime}]:[]),...(p.endTime>cut.endTime?[{...p,startTime:cut.endTime}]:[])]),periods);}
export function quickEntryFrom(draft:AnnotationDraft):QuickEntry {
 if(draft.quickEntry?.version===1&&Array.isArray(draft.quickEntry.rows)&&draft.quickEntry.rows.length<=20&&draft.quickEntry.rows.every(row=>row&&typeof row.id==='string'&&['parking','condition'].includes(row.kind)&&typeof row.value==='string'&&Array.isArray(row.days)&&row.days.every(day=>Number.isInteger(day)&&day>=0&&day<=6)&&(row.daysSpecified===undefined||typeof row.daysSpecified==='boolean')&&(row.holidaysApply===undefined||typeof row.holidaysApply==='boolean')&&typeof row.allDay==='boolean'&&typeof row.start==='string'&&typeof row.end==='string'&&typeof row.paid==='boolean'&&typeof row.fee==='string'&&typeof row.local==='boolean'&&Number.isFinite(row.from)&&Number.isFinite(row.to))&&typeof draft.quickEntry.holidaysApply==='boolean')return {...draft.quickEntry,rows:draft.quickEntry.rows.map(row=>({...row,daysSpecified:row.daysSpecified,holidaysApply:row.holidaysApply??draft.quickEntry!.holidaysApply}))};
 const candidate=(draft.schedule as ParkingSchedule)?.rules;
 const rules=Array.isArray(candidate)?candidate.filter(rule=>rule&&Array.isArray(rule.periods)&&rule.periods.every(p=>p&&Number.isInteger(p.dayOfWeek)&&Number.isInteger(p.startTime)&&Number.isInteger(p.endTime))):[];
 const clock=(value:number)=>`${String(Math.floor(value%1440/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`;
 const rows:QuickRow[]=[];
 for(const rule of rules){const wording=typeof rule.source?.reference==='string'?rule.source.reference:'';const groups=new Map<string,TimePeriod[]>();for(const p of rule.periods){const key=`${p.startTime}:${p.endTime}`,group=groups.get(key)??[];group.push(p);groups.set(key,group);}
  for(const [key,periods] of groups){const condition=!!CONDITION_LABELS[rule.type];rows.push({...newQuickRow(condition?'condition':'parking',`${rule.id}:${key}`),value:condition?rule.type:rule.maxDurationMinutes?rule.maxDurationMinutes<60?`${rule.maxDurationMinutes} min`:`${rule.maxDurationMinutes/60}P`:rule.type==='free'||rule.type==='fee'?'untimed':'',days:periods.map(p=>p.dayOfWeek),daysSpecified:wording.includes('No days listed on the sign.')?false:wording.includes('Named weekdays on the sign.')?true:undefined,holidaysApply:rule.holidayPolicy!=='excluded',allDay:periods[0].startTime===0&&periods[0].endTime===1440,start:clock(periods[0].startTime),end:clock(periods[0].endTime),paid:rule.feeStatus==='paid',fee:rule.feeCents===undefined?'':String(rule.feeCents/100),local:!!rule.extent,from:(rule.extent?.start??0)*100,to:(rule.extent?.end??.1)*100});}
 }
 return {version:1,rows:rows.length?rows:[newQuickRow('parking','initial-parking')],holidaysApply:rules.length>0&&rules.every(rule=>rule.holidayPolicy!=='excluded')};
}
export function compileQuickDraft(base:AnnotationDraft,entry:QuickEntry,confirmed:boolean,now:string):{draft:AnnotationDraft;errors:string[]} {
 const errors:string[]=[],built:ParkingRule[]=[];
 for(const [index,row] of entry.rows.entries()){
  const periods=quickPeriods(row);if(!periods.length)errors.push(`Choose days and valid hours for entry ${index+1}.`);
  const limit=quickLimitMinutes(row.value),condition=row.kind==='condition';let type:RuleType='unknown';
  if(condition){if(CONDITION_LABELS[row.value])type=row.value as RuleType;else errors.push('Choose a special condition.');}
  else if(['untimed','No time limit'].includes(row.value))type=row.paid?'fee':'free';
  else if(limit!==null)type='time_limit';
  else errors.push(`Choose a parking limit such as 2P or 5 min for entry ${index+1}.`);
  if(row.fee&&(!Number.isFinite(Number(row.fee))||Number(row.fee)<0))errors.push('Enter a valid optional fee.');
  if(row.local&&!(Number.isFinite(row.from)&&Number.isFinite(row.to)&&row.from>=0&&row.to<=100&&row.from<row.to))errors.push('Check the start and end percentages of the local restriction.');
  built.push({id:row.id,type,periods,feeStatus:row.paid?'paid':'free',...(row.paid&&row.fee?{feeCents:Math.round(Number(row.fee)*100)}:{}),...(type==='time_limit'?{maxDurationMinutes:limit!}:{}),permitCondition:type==='permit'?'required':'none',holidayPolicy:(row.holidaysApply??entry.holidaysApply)?'applies':'excluded',...(condition&&row.local?{extent:{start:row.from/100,end:row.to/100}}:{}),source:{type:'community',identifier:row.id,evidenceKind:'community_entry',observedAt:now,submittedAt:now,sourceDate:null,reference:`Community-entered interpretation; not a verbatim sign transcript or field observation. ${row.daysSpecified===false?'No days listed on the sign.':row.daysSpecified===true?'Named weekdays on the sign.':'Day wording was not recorded in this older draft.'}`}});
 }
 for(let i=0;i<built.length;i++)for(let j=i+1;j<built.length;j++){
  const a=built[i],b=built[j];if(entry.rows[i].kind!==entry.rows[j].kind)continue;
  const ea=a.extent??{start:0,end:1},eb=b.extent??{start:0,end:1};
  if(ea.start<eb.end&&eb.start<ea.end&&a.periods.some(p=>b.periods.some(q=>overlaps(p,q))))errors.push(entry.rows[i].kind==='condition'?'Special conditions overlap. Adjust their days or hours.':'Parking periods overlap. Adjust their days or hours.');
 }
 const cuts=built.filter((_,index)=>entry.rows[index].kind==='condition').filter(rule=>!rule.extent||(rule.extent.start===0&&rule.extent.end===1));
 for(const [index,rule] of built.entries()){
  if(entry.rows[index].kind!=='parking'||!rule.periods.length)continue;
  const applicableCuts=cuts.filter(cut=>!(rule.holidayPolicy==='applies'&&cut.holidayPolicy==='excluded'));
  if(!subtract(rule.periods,applicableCuts.flatMap(cut=>cut.periods)).length)errors.push(`Parking period ${index+1} is completely covered by special conditions. Change its days or hours, remove the parking period, or mark the restriction as applying to a smaller road section.`);
 }
 const rules=built.flatMap((rule,index)=>{if(rule.type==='unknown')return [];const periods=entry.rows[index].kind==='parking'?subtract(rule.periods,cuts.filter(cut=>!(rule.holidayPolicy==='applies'&&cut.holidayPolicy==='excluded')).flatMap(cut=>cut.periods)):rule.periods;return periods.length?[{...rule,periods}]:[];});
 if(!rules.length)errors.push('Add at least one parking rule or special condition.');
 const panels=rules.map(rule=>{const row=entry.rows.find(value=>value.id===rule.id)!;const label=row.kind==='condition'?CONDITION_LABELS[row.value]:['untimed','No time limit'].includes(row.value)?'No time limit':/\d\s*(?:m|min|mins|minute|minutes)$/i.test(row.value.trim())?`${rule.maxDurationMinutes} ${rule.maxDurationMinutes===1?'minute':'minutes'}`:row.value.trim().toUpperCase().endsWith('P')?row.value.trim():`${row.value.trim()}P`;return {id:`entry:${rule.id}`,text:`Community interpretation: ${label}${row.paid?' · paid':''} · ${rule.periods.map(p=>displayPeriod(p)).join(', ')}`,arrow:'both' as const,ruleIds:[rule.id]};});
 return {errors:[...new Set(errors)],draft:{...base,quickEntry:entry,allPanelsAndBoundariesChecked:confirmed,panels,schedule:{schemaVersion:1,sectionId:base.sectionId,geometryVersion:base.geometryVersion,completeness:confirmed&&!errors.length?'complete':'draft',coverage:confirmed&&!errors.length?'full_schedule':'partial',verification:'unverified',confidenceLevel:1,lastVerifiedAt:null,changeState:'none',rules}}};
}
