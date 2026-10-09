"use client";
import SubmissionConfirmation from "./SubmissionConfirmation";
import StreetViewLink from "../map/StreetViewLink";
import {useEffect,useState} from "react";
import type {SessionKind} from "../../lib/server/eligibility";
import type {FormEvent} from "react";
import {validateParkingSchedule} from "../../domain/parking/validation";
import {validateAnnotationDraft} from "../../domain/community/draft";
import type {AnnotationDraft} from "../../domain/community/draft";
import type {ParkingSchedule} from "../../domain/parking/types";
interface Props {
 section:{sectionId:string;geometryVersion:number};initialDraft:AnnotationDraft;
 coordinates?:{longitude:number;latitude:number};
 /** UI gate only; submission endpoints must independently verify the session. */
 sessionKind?:SessionKind;
 submissionAvailable?:boolean;
 reviewSubmission?:boolean;geometryLocked?:boolean;
 onDraftChange?:(draft:AnnotationDraft)=>void;
 onSave:(draft:AnnotationDraft)=>Promise<void>;
 onSubmit:(draft:AnnotationDraft)=>Promise<void>;
 /** Structured rule editor supplied separately; never infer rules from sign text. */
 scheduleEditor?:(schedule:unknown,onChange:(schedule:unknown)=>void)=>React.ReactNode;
}
export default function AnnotationForm({section,initialDraft,onSave,onSubmit,scheduleEditor,coordinates,sessionKind="guest",submissionAvailable=true,reviewSubmission=false,geometryLocked=false,onDraftChange}:Props) {
 const [draft,setDraft]=useState(initialDraft),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 useEffect(()=>{onDraftChange?.(draft);},[draft,onDraftChange]);
 const canContribute=sessionKind==="eligible" || sessionKind==="admin";
 const validation=validateAnnotationDraft(draft,section,reviewSubmission?(draft.schedule as ParkingSchedule)?.rules?.filter(rule=>rule.source?.evidenceKind==="street_view").map(rule=>rule.source.identifier)??[]:[]);
 const schedule=validateParkingSchedule(draft.schedule).valid?draft.schedule as ParkingSchedule:null;
 const time=(minutes:number)=>`${String(Math.floor(minutes/60)).padStart(2,"0")}:${String(minutes%60).padStart(2,"0")}`;
 function change(patch:Partial<AnnotationDraft>){setDraft(value=>({...value,quickEntry:undefined,...patch}));setMessage("");}
 async function save(publish:boolean){
  if(!canContribute || busy || (publish && !submissionAvailable) || !(publish?validation.publishable:validation.validDraft)) return;
  setBusy(true);setMessage("");
  try {await (publish?onSubmit:onSave)(draft);setMessage(publish?"Sent for review.":"Draft saved. It has not been published.");}
  catch(error) {setMessage(`${error instanceof Error?error.message:"Could not save"}. Your draft is retained; try again.`);}
  finally {setBusy(false);}
 }
 function submit(event:FormEvent){event.preventDefault();void save(true);}
 if(!canContribute) return <section aria-label="Annotation access"><p role="status">Sign in with an eligible account to create or submit annotations. Anonymous contributions are disabled.</p></section>;
 const control={width:"100%",minWidth:0,minHeight:44};
 return <form aria-label="Section annotation" onSubmit={submit} style={{width:"100%",maxWidth:"32rem",minWidth:0}}>
  <p>Record every sign panel and relevant boundary. Street View transcriptions can be retained as unverified drafts; record the image date and do not label them as field observations. Entries begin unverified. Approval requires five distinct eligible contributors agreeing on the complete rules, or an admin.</p>
  {coordinates && <StreetViewLink {...coordinates}/>}
  <fieldset disabled={busy} style={{minWidth:0}}><legend>Street side and boundaries</legend>
   <label>Street side<select aria-label="Street side" disabled={geometryLocked} style={control} value={draft.side} onChange={event=>change({side:event.target.value as AnnotationDraft["side"]})}>
    <option value="unknown">Unknown</option><option value="left">Left</option><option value="right">Right</option>
   </select></label>
   <label>Start boundary<input readOnly={geometryLocked} style={control} value={draft.startDescription} onChange={event=>change({startDescription:event.target.value})}/></label>
   <label>End boundary<input readOnly={geometryLocked} style={control} value={draft.endDescription} onChange={event=>change({endDescription:event.target.value})}/></label>
  </fieldset>
  <fieldset disabled={busy} style={{minWidth:0}}><legend>All visible sign panels</legend>
   {draft.panels.map((panel,index)=><fieldset key={panel.id} style={{minWidth:0}}><legend>Panel {index+1}</legend>
    <label>Exact sign text<textarea style={control} value={panel.text} onChange={event=>change({panels:draft.panels.map((p,i)=>i===index?{...p,text:event.target.value}:p)})}/></label>
    <label>Arrow extent<select aria-label="Arrow extent" style={control} value={panel.arrow} onChange={event=>change({panels:draft.panels.map((p,i)=>i===index?{...p,arrow:event.target.value as typeof p.arrow}:p)})}>
     {(["unknown","left","right","both","none"] as const).map(value=><option key={value} value={value}>{value}</option>)}
    </select></label>
    <fieldset><legend>Rules described by this panel</legend>
     {Array.isArray((draft.schedule as ParkingSchedule)?.rules) && (draft.schedule as ParkingSchedule).rules.map((rule,r)=><label key={rule.id}><input type="checkbox" checked={panel.ruleIds.includes(rule.id)} onChange={event=>change({panels:draft.panels.map((p,i)=>i===index?{...p,ruleIds:event.target.checked?[...p.ruleIds,rule.id]:p.ruleIds.filter(id=>id!==rule.id)}:p)})}/>Rule {r+1}: {rule.type.replaceAll("_"," ")}</label>)}
     <p>Add parking rules below, then select the rules this sign panel describes.</p>
    </fieldset>
    <button type="button" style={{minHeight:44}} onClick={()=>change({panels:draft.panels.filter((_,i)=>i!==index)})}>Remove panel {index+1}</button>
   </fieldset>)}
   <button type="button" disabled={draft.panels.length>=20} style={{minHeight:44}} onClick={()=>change({panels:[...draft.panels,{id:crypto.randomUUID(),text:"",arrow:"unknown",ruleIds:[]}]})}>Add sign panel</button>
   <label><input type="checkbox" checked={draft.allPanelsAndBoundariesChecked} onChange={event=>change({allPanelsAndBoundariesChecked:event.target.checked})}/>All visible panels and relevant boundaries checked</label>
  </fieldset>
  {scheduleEditor?scheduleEditor(draft.schedule,schedule=>change({schedule})):<p>Structured rule editing is not connected yet. Existing rules can be previewed and incomplete drafts saved.</p>}
  <section aria-label="Full schedule preview"><h2>Interpreted schedule preview</h2>
   {schedule && Array.isArray(schedule.rules)?<ul>{schedule.rules.map(rule=><li key={rule.id}>
    {rule.id} · {rule.type.replaceAll("_"," ")} · fee {rule.feeStatus} · permit {rule.permitCondition} · holiday {rule.holidayPolicy}
    {rule.maxDurationMinutes && ` · maximum ${rule.maxDurationMinutes} minutes`}
    {rule.feeCents!==undefined && ` · fee ${rule.feeCents} cents`}
    <ul>{rule.periods.map((period,index)=><li key={index}>{["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][period.dayOfWeek]} · {time(period.startTime)}–{time(period.endTime)}</li>)}</ul>
    <p>Evidence: {rule.source.evidenceKind}; observed {rule.source.observedAt}; source date {rule.source.sourceDate??"unknown"}</p>
   </li>)}</ul>:<p>Schedule incomplete. No free parking permission can be inferred.</p>}
  </section>
  {!validation.publishable && <ul aria-label="Publication requirements">{validation.errors.map((error,index)=><li key={index}>{error}</li>)}</ul>}
  <button type="button" style={{minHeight:44}} disabled={busy || !validation.validDraft} onClick={()=>void save(false)}>Save incomplete draft</button>
  <button type="submit" style={{minHeight:44}} disabled={busy || !validation.publishable || !scheduleEditor || !submissionAvailable}>Submit complete annotation</button>
  {message==="Sent for review."?<SubmissionConfirmation/>:<p role="status">{message}</p>}
 </form>;
}
