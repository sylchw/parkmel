"use client";
import {useCallback,useEffect,useState} from "react";
import QuickAnnotationForm from "./QuickAnnotationForm";
import AnnotationForm from "./AnnotationForm";
import ScheduleEditor from "./ScheduleEditor";
import type {AnnotationDraft} from "../../domain/community/draft";
import {validateAnnotationDraft} from "../../domain/community/draft";
import type {ParkingSchedule} from "../../domain/parking/types";
import type {StreetSide} from "../../lib/map/street-index";
import type {SessionKind} from "../../lib/server/eligibility";
function emptyDraft(target?:StreetSide|null):AnnotationDraft {
 const sectionId=target?.id??crypto.randomUUID();return {schemaVersion:1,sectionId,geometryVersion:1,side:target?.properties.side??"unknown",startDescription:target?.properties.startDescription??"",endDescription:target?.properties.endDescription??"",allPanelsAndBoundariesChecked:false,panels:[],schedule:{schemaVersion:1,sectionId,geometryVersion:1,completeness:"draft",coverage:"partial",verification:"unverified",confidenceLevel:1,lastVerifiedAt:null,changeState:"none",rules:[]}};
}
export default function AnnotationWorkspace({userId,sessionKind,coordinates,target,streetSides=[]}:{userId:string;sessionKind:SessionKind;coordinates:{longitude:number;latitude:number};target?:StreetSide|null;streetSides?:StreetSide[]}) {
 const [detailed,setDetailed]=useState(false);
 const [location,setLocation]=useState(coordinates);
 const [history,setHistory]=useState<string[]>([]);
 const [notice,setNotice]=useState("");
 const [draft,setDraft]=useState<AnnotationDraft|null>(null),[error,setError]=useState("");
 const key=`parkmel-draft-v1:${userId}`;
 useEffect(()=>{
  let active=true;
  async function restore(){
   function accept(saved:{draft:AnnotationDraft;coordinates:typeof coordinates}){
    const value=saved.draft;
    if(!validateAnnotationDraft(value,{sectionId:value.sectionId,geometryVersion:value.geometryVersion}).validDraft)throw new Error();
    if(active){setDraft(value);setDetailed(!value.quickEntry&&value.panels.length>0);setLocation(saved.coordinates);}
   }
   try {
    const ids=JSON.parse(localStorage.getItem(`${key}:history`)??"[]");if(active&&Array.isArray(ids))setHistory(ids.filter((id:unknown)=>typeof id==="string"));
    const stored=localStorage.getItem(target?`${key}:${target.id}`:key);
    if(stored){const saved=JSON.parse(stored);accept(saved.draft?saved:{draft:saved,coordinates});return;}
    try {
     const response=await fetch("/api/drafts",{cache:"no-store"});
     if(response.ok){const data=await response.json();const row=target?data.drafts?.find((item:{payload:AnnotationDraft})=>item.payload.sectionId===target.id):data.drafts?.[0];if(row){accept({draft:row.payload,coordinates:{longitude:row.longitude,latitude:row.latitude}});if(active)setNotice("Restored your latest account draft.");return;}}
    }catch{ /* Local drafting remains available without a network connection. */ }
    if(active){setDraft(emptyDraft(target));setDetailed(false);setLocation(coordinates);}
   }catch{if(active){setDraft(emptyDraft(target));setLocation(coordinates);setError("Browser storage is unavailable. Save to your account or export a backup.");}}
  }
  void restore();return()=>{active=false;};
 // The draft keeps its original location even when the search location changes.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[key,target?.id]);
 const retain=useCallback((value:AnnotationDraft)=>{
  setDraft(value);
  try{const stored=JSON.stringify({draft:value,coordinates:location});localStorage.setItem(key,stored);localStorage.setItem(`${key}:${value.sectionId}`,stored);
   const ids:string[]=JSON.parse(localStorage.getItem(`${key}:history`)??"[]");
   if(!ids.includes(value.sectionId)){ids.push(value.sectionId);localStorage.setItem(`${key}:history`,JSON.stringify(ids));setHistory(ids);}
   setDraft(value);}catch{setError("Browser storage is full or unavailable. Export this draft before leaving.");}
 },[key,location]);
 async function save(value:AnnotationDraft){
  retain(value);
  try {const response=await fetch("/api/drafts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({draft:value,coordinates:location})});
   setNotice(response.ok?"Saved to your account and this browser. Not published.":"Saved on this browser. Account storage is unavailable; export a backup.");
  }catch{setNotice("Saved on this browser. Network unavailable; export a backup.");}
 }
 function download(){if(!draft)return;const url=URL.createObjectURL(new Blob([JSON.stringify({draft,coordinates:location},null,2)],{type:"application/json"}));const link=document.createElement("a");link.href=url;link.download="parkmel-parking-draft.json";link.click();URL.revokeObjectURL(url);}
 function restoreDraft(id:string){try{const saved=JSON.parse(localStorage.getItem(`${key}:${id}`)??"null");if(!saved||!validateAnnotationDraft(saved.draft,{sectionId:id,geometryVersion:saved.draft.geometryVersion}).validDraft)throw new Error();setLocation(saved.coordinates);setDraft(saved.draft);setNotice("");}catch{setError("Could not restore that draft. Your current draft is retained.");}}
 async function submit(value:AnnotationDraft){
  const response=await fetch("/api/annotations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(value)});
  const body=await response.json();if(!response.ok)throw new Error(body.error??"Submission failed");
  setNotice(`Submitted for review. Reference: ${body.id}. Your draft is retained.`);
 }
 return <><p>{target?`${target.properties.name} · ${target.properties.side} side · ${target.properties.startDescription} to ${target.properties.endDescription}. ${target.properties.direction}`:"Choose a street side using search or a grey map line before starting a publishable draft."}</p><button type="button" onClick={()=>{setLocation(coordinates);setDraft(emptyDraft(target));setNotice("New sign draft started at the selected map location. Earlier drafts remain saved on this browser.");}}>Start another sign draft</button>
  <details className="draft-backups"><summary>Saved drafts and backup</summary>
  <label>Saved sign drafts<select aria-label="Saved sign drafts" value={draft?.sectionId??""} onChange={event=>restoreDraft(event.target.value)}><option value="">Choose a draft</option>{history.map((id,index)=><option key={id} value={id}>Sign draft {index+1}</option>)}</select></label>
  <p>Draft location: {location.latitude}, {location.longitude}. It stays with this draft when you change the search location.</p><p>Edits are saved in this browser. Save draft backs up to your account. Initial rules need an admin approval or five matching verified contributors; later changes need an admin.</p>
</details>
  {notice&&<p role="status">{notice}</p>}
  {error&&<p role="alert">{error}</p>}
  {draft&&<><button type="button" onClick={()=>setDetailed(value=>!value)}>{detailed?"Use simple editor":"Use detailed editor"}</button>{detailed?<AnnotationForm key={draft.sectionId} section={draft} initialDraft={draft} onDraftChange={retain} sessionKind={sessionKind} coordinates={location} onSave={save} onSubmit={submit} submissionAvailable={streetSides.some(side=>side.id===draft.sectionId)} reviewSubmission={true} geometryLocked={streetSides.some(side=>side.id===draft.sectionId)} scheduleEditor={(value,onChange)=><ScheduleEditor schedule={value as ParkingSchedule} onChange={onChange}/>}/>:<QuickAnnotationForm key={draft.sectionId} initialDraft={draft} coordinates={location} onDraftChange={retain} onSave={save} onSubmit={submit} submissionAvailable={streetSides.some(side=>side.id===draft.sectionId)}/>}<button type="button" onClick={download}>Export draft</button></>}

 </>;
}
