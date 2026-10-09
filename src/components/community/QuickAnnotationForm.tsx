"use client";
import {useEffect,useMemo,useState} from 'react';
import SubmissionConfirmation from "./SubmissionConfirmation";
import StreetViewLink from '../map/StreetViewLink';
import type {AnnotationDraft} from '../../domain/community/draft';
import {validateAnnotationDraft} from '../../domain/community/draft';
import {compileQuickDraft,quickEntryFrom,newQuickRow,updateQuickRow,DAYS,CONDITION_LABELS} from '../../domain/community/quick-entry';
import type {QuickRow} from '../../domain/community/quick-entry';
interface Props {initialDraft:AnnotationDraft;coordinates:{longitude:number;latitude:number};submissionAvailable:boolean;onDraftChange:(draft:AnnotationDraft)=>void;onSave:(draft:AnnotationDraft)=>Promise<void>;onSubmit:(draft:AnnotationDraft)=>Promise<void>}
export default function QuickAnnotationForm({initialDraft,coordinates,submissionAvailable,onDraftChange,onSave,onSubmit}:Props){
 const [base]=useState(initialDraft),[entry,setEntry]=useState(()=>quickEntryFrom(initialDraft)),[confirmed,setConfirmed]=useState(initialDraft.allPanelsAndBoundariesChecked),[now]=useState(()=>new Date().toISOString());
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const compiled=useMemo(()=>compileQuickDraft(base,entry,confirmed,now),[base,entry,confirmed,now]);
 const validation=validateAnnotationDraft(compiled.draft,base);
 useEffect(()=>{onDraftChange(compiled.draft);},[compiled.draft,onDraftChange]);
 useEffect(()=>{setMessage('');},[entry,confirmed]);
 function patch(id:string,change:Partial<QuickRow>){setEntry(value=>({...value,rows:value.rows.map(row=>row.id===id?updateQuickRow(row,change):row)}));setConfirmed(false);setMessage('');}
 function add(kind:QuickRow['kind']){setEntry(value=>({...value,rows:[...value.rows,newQuickRow(kind,crypto.randomUUID(),value.rows)]}));setConfirmed(false);}
 async function save(submit:boolean){if(busy||(submit&&(!submissionAvailable||!validation.publishable)))return;setBusy(true);setMessage('');try{await (submit?onSubmit:onSave)(compiled.draft);setMessage(submit?'Sent for review.':'Draft saved.');}catch(error){setMessage(`${error instanceof Error?error.message:'Could not save'}. Your draft is retained.`);}finally{setBusy(false);}}
 return <form aria-label="Parking details" className="quick-annotation" onSubmit={event=>{event.preventDefault();void save(true);}}>
  <p>Enter minutes (e.g. 1 min or 5 min) or hours (e.g. 2P), tick the days and set the hours. Add special conditions if the rules change at certain times. No sign photo is needed.</p>
  <StreetViewLink {...coordinates}/>
  <datalist id="quick-parking-limits">{['No time limit','1 min','5 min','10 min','15 min','30 min','1/4P','1/2P','1P','2P','3P','4P','6P','8P','12P'].map(value=><option key={value} value={value}/>)}</datalist>
  <fieldset disabled={busy} className="quick-controls"><legend className="sr-only">Parking rules</legend>
   {entry.rows.map((row,index)=><fieldset key={row.id} className="quick-entry-card"><legend>{row.kind==='parking'?`Parking period ${index+1}`:`Special condition ${index+1}`}</legend>
    {row.kind==='parking'?<label>Parking limit<input list="quick-parking-limits" placeholder="e.g. 5 min or 2P" maxLength={30} value={row.value} onChange={event=>patch(row.id,{value:event.target.value})}/></label>:<label>Special condition<select aria-label="Special condition" value={row.value} onChange={event=>patch(row.id,{value:event.target.value})}>{Object.entries(CONDITION_LABELS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>}
    {row.daysSpecified===undefined&&<p className="quick-help">For this saved entry, check whether the sign names weekdays or has no days listed.</p>}
    <label className="quick-check"><input type="checkbox" checked={row.daysSpecified===false} onChange={event=>patch(row.id,{daysSpecified:!event.target.checked})}/>No days listed on the sign (every day)</label>
    <fieldset disabled={row.daysSpecified===false} className="quick-days"><legend>Days that apply</legend>{DAYS.map(day=><label key={day.day}><input type="checkbox" aria-label={day.name} checked={row.days.includes(day.day)} onChange={event=>patch(row.id,{days:event.target.checked?[...row.days,day.day]:row.days.filter(value=>value!==day.day)})}/><span>{day.name.slice(0,3)}</span></label>)}</fieldset>
    <label className="quick-check"><input type="checkbox" checked={row.allDay} onChange={event=>patch(row.id,{allDay:event.target.checked})}/>All day</label>
    {!row.allDay&&<div className="quick-times"><label>From<input type="time" value={row.start} onChange={event=>patch(row.id,{start:event.target.value})}/></label><label>Until<input type="time" value={row.end} onChange={event=>patch(row.id,{end:event.target.value})}/></label></div>}
    {!row.allDay&&<p className="quick-help">An end time earlier than the start continues into the next day.</p>}
    <label className="quick-check"><input type="checkbox" checked={row.paid} onChange={event=>patch(row.id,{paid:event.target.checked})}/>Payment required / metered</label>
    {row.paid&&<details><summary>Add fee information (optional)</summary><label>Fee shown ($)<input type="number" min="0" step="0.01" value={row.fee} onChange={event=>patch(row.id,{fee:event.target.value})}/></label></details>}
    {row.kind==='condition'&&<details><summary>Only part of this street section?</summary><label className="quick-check"><input type="checkbox" checked={row.local} onChange={event=>patch(row.id,{local:event.target.checked})}/>Applies to a smaller part</label>{row.local&&<><p className="quick-help">Measured from the section&apos;s start towards its end.</p><div className="quick-times"><label>Starts at (%)<input type="number" min="0" max="99" value={row.from} onChange={event=>patch(row.id,{from:Number(event.target.value)})}/></label><label>Ends at (%)<input type="number" min="1" max="100" value={row.to} onChange={event=>patch(row.id,{to:Number(event.target.value)})}/></label></div></>}</details>}
    <label className="quick-check"><input type="checkbox" checked={row.holidaysApply??entry.holidaysApply} onChange={event=>patch(row.id,{holidaysApply:event.target.checked})}/>These times also apply on public holidays</label>
    <p className="quick-help">No days listed checks this automatically. Named weekdays, including Mon–Sun, uncheck it. Override only when the sign says otherwise.</p>
    {entry.rows.length>1&&<button type="button" onClick={()=>{setEntry(value=>({...value,rows:value.rows.filter(item=>item.id!==row.id)}));setConfirmed(false);}}>Remove this entry</button>}
   </fieldset>)}
   <div className="quick-actions"><button type="button" disabled={entry.rows.length>=20} onClick={()=>add('parking')}>Add another parking period</button><button type="button" disabled={entry.rows.length>=20} onClick={()=>add('condition')}>Add special condition</button></div>
   <label className="quick-check"><input type="checkbox" required aria-required="true" checked={confirmed} onChange={event=>setConfirmed(event.target.checked)}/>I&apos;ve checked the rules, special conditions and boundaries for this street side<span className="required-marker" aria-hidden="true">*</span></label><p className="quick-help">Required before submitting for review.</p>
  </fieldset>
  {compiled.errors.length>0&&<p role="alert" className="quick-help">{compiled.errors.join(' ')}</p>}
  {!submissionAvailable&&<p>Select a registered street side on the map before submitting.</p>}
  <div className="quick-actions"><button type="button" disabled={busy} onClick={()=>void save(false)}>Save draft</button><button className="review-submit" type="submit" disabled={busy||!confirmed||!submissionAvailable||!validation.publishable}>{busy?"Please wait…":message==='Sent for review.'?"Sent for review ✓":"Submit for review"}</button></div>
  <p className="quick-help">Contributions stay unverified until approved by an admin or five matching verified contributors.</p>
  {message==='Sent for review.'?<SubmissionConfirmation/>:message&&<p role="status">{message}</p>}
 </form>;
}
