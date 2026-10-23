"use client";
import type {ParkingRule,ParkingSchedule} from "../../domain/parking/types";
export function newRule(now:string):ParkingRule {
 return {id:crypto.randomUUID(),type:"unknown",periods:[],feeStatus:"unknown",permitCondition:"unknown",holidayPolicy:"unknown",
  source:{type:"community",identifier:crypto.randomUUID(),evidenceKind:"street_view",observedAt:now,submittedAt:now,sourceDate:null}};
}
export default function ScheduleEditor({schedule,onChange}:{schedule:ParkingSchedule;onChange:(value:ParkingSchedule)=>void}) {
 function patch(index:number,value:Partial<ParkingRule>) {onChange({...schedule,rules:schedule.rules.map((rule,i)=>i===index?{...rule,...value}:rule)});}
 return <fieldset><legend>Interpreted parking rules</legend>
  <p>Enter each active period explicitly. Split overnight periods at midnight. Unknown values remain unknown.</p>
  <label><input type="checkbox" checked={schedule.completeness==="complete"} onChange={event=>onChange({...schedule,completeness:event.target.checked?"complete":"draft",coverage:event.target.checked?"full_schedule":"partial"})}/>The schedule covers all rules and times</label>
  {schedule.rules.map((rule,index)=><fieldset key={rule.id}><legend>Rule {index+1}</legend>
   
   <label>Rule type<select aria-label="Rule type" value={rule.type} onChange={event=>patch(index,{type:event.target.value as ParkingRule["type"]})}>
    {["unknown","free","time_limit","fee","clearway","permit","loading","accessible","no_parking","no_stopping","towaway","conditional"].map(value=><option key={value} value={value}>{value.replaceAll("_"," ")}</option>)}
   </select></label>
   <label>Fee status<select aria-label="Fee status" value={rule.feeStatus} onChange={event=>patch(index,{feeStatus:event.target.value as ParkingRule["feeStatus"]})}>{["unknown","free","paid"].map(value=><option key={value}>{value}</option>)}</select></label>
   <label>Fee amount (cents, leave empty if unknown)<input type="number" min="0" value={rule.feeCents??""} onChange={event=>patch(index,{feeCents:event.target.value?Number(event.target.value):undefined})}/></label>
   {["loading","accessible","no_parking","no_stopping","towaway","clearway","permit"].includes(rule.type)&&<><label><input type="checkbox" checked={!!rule.extent} onChange={event=>patch(index,{extent:event.target.checked?{start:0,end:0.1}:undefined})}/>This restriction applies to a small part of this street side</label>{rule.extent&&<><p>Percent measured from the section’s start junction towards its end. General parking remains the main colour elsewhere.</p><label>Restriction starts at (%)<input type="number" min="0" max="99" value={rule.extent.start*100} onChange={event=>patch(index,{extent:{start:Number(event.target.value)/100,end:rule.extent!.end}})}/></label><label>Restriction ends at (%)<input type="number" min="1" max="100" value={rule.extent.end*100} onChange={event=>patch(index,{extent:{start:rule.extent!.start,end:Number(event.target.value)/100}})}/></label></>}</>}
   <label>Maximum stay (minutes, leave empty if unspecified)<input type="number" min="1" value={rule.maxDurationMinutes??""} onChange={event=>patch(index,{maxDurationMinutes:event.target.value?Number(event.target.value):undefined})}/></label>
   <label>Permit condition<select aria-label="Permit condition" value={rule.permitCondition} onChange={event=>patch(index,{permitCondition:event.target.value as ParkingRule["permitCondition"]})}>{["unknown","none","required"].map(value=><option key={value}>{value}</option>)}</select></label>
   <label>Public holidays<select aria-label="Public holidays" value={rule.holidayPolicy} onChange={event=>patch(index,{holidayPolicy:event.target.value as ParkingRule["holidayPolicy"]})}>{["unknown","applies","excluded"].map(value=><option key={value}>{value}</option>)}</select></label>
   <label>Evidence type<select aria-label="Evidence type" value={rule.source.evidenceKind} onChange={event=>patch(index,{source:{...rule.source,evidenceKind:event.target.value as ParkingRule["source"]["evidenceKind"]}})}>{["community_entry","street_view","field","unknown"].map(value=><option key={value} value={value}>{value.replaceAll("_"," ")}</option>)}</select></label>
   <label>Source link or reference<input value={rule.source.reference??""} onChange={event=>patch(index,{source:{...rule.source,reference:event.target.value||undefined}})}/></label>
   <label>Image date (Street View requires a known date)<input type="date" value={rule.source.sourceDate??""} onChange={event=>patch(index,{source:{...rule.source,sourceDate:event.target.value||null}})}/></label>
   <label>Observation date and time (UTC)<input type="datetime-local" value={rule.source.observedAt.slice(0,16)} onChange={event=>{const date=new Date(event.target.value+":00Z");if(Number.isFinite(date.getTime()))patch(index,{source:{...rule.source,observedAt:date.toISOString(),submittedAt:new Date().toISOString()}});}}/></label>
   {rule.periods.map((period,p)=><div key={p} className="period-row">
    <label>Day<select aria-label="Day" value={period.dayOfWeek} onChange={event=>patch(index,{periods:rule.periods.map((v,i)=>i===p?{...v,dayOfWeek:Number(event.target.value)}:v)})}>{["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map((day,i)=><option key={day} value={i}>{day}</option>)}</select></label>
    <label>Start time<input type="time" value={`${String(Math.floor(period.startTime/60)).padStart(2,"0")}:${String(period.startTime%60).padStart(2,"0")}`} onChange={event=>patch(index,{periods:rule.periods.map((v,i)=>i===p?{...v,startTime:event.target.value.split(":").map(Number).reduce((hours,minutes)=>hours*60+minutes)}:v)})}/></label>
    <label>End time (00:00 means end of day)<input type="time" value={`${String(Math.floor(period.endTime%1440/60)).padStart(2,"0")}:${String(period.endTime%60).padStart(2,"0")}`} onChange={event=>patch(index,{periods:rule.periods.map((v,i)=>i===p?{...v,endTime:(event.target.value.split(":").map(Number).reduce((hours,minutes)=>hours*60+minutes))||1440}:v)})}/></label>
    <button type="button" onClick={()=>patch(index,{periods:rule.periods.filter((_,i)=>i!==p)})}>Remove period</button>
   </div>)}
   <button type="button" onClick={()=>patch(index,{periods:[...rule.periods,{dayOfWeek:1,startTime:540,endTime:1020}]})}>Add active period</button>
   <button type="button" onClick={()=>onChange({...schedule,rules:schedule.rules.filter((_,i)=>i!==index)})}>Remove rule</button>
  </fieldset>)}
  <button type="button" onClick={()=>onChange({...schedule,rules:[...schedule.rules,newRule(new Date().toISOString())]})}>Add parking rule</button>
 </fieldset>;
}
