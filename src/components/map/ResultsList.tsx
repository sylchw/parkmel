"use client";
import {parkingDisplayLabel} from "../../lib/map/parking-display";
import {useState} from "react";
import type {ReactNode} from "react";
import type {evaluatedSections} from "../../lib/server/sections";
import SectionSheet from "./SectionSheet";
export type EvaluatedSection=ReturnType<typeof evaluatedSections>["sections"][number];
export function eligibilityLabel(value:EvaluatedSection["eligibility"]):string {
 return {eligible_free:"Free for the selected stay",eligible_paid:"Paid for the selected stay",restricted:"Restricted for the selected stay",unknown:"Parking rules unknown"}[value];
}
interface Props {sections:readonly EvaluatedSection[];selectedId:string|null;onSelect:(id:string)=>void;map?:ReactNode;evaluatedAt:string}
export default function ResultsList({sections,selectedId,onSelect,map,evaluatedAt}:Props) {
 const [view,setView]=useState<"list"|"map">("list");
 const selected=sections.find(section=>section.sectionId===selectedId);
 return <section aria-label="Parking results">
  <p>These results describe parking rules for your stay. They do not show whether a space is vacant. Check the signs before parking.</p>
  {map && <div role="group" aria-label="Results view">
   <button type="button" aria-pressed={view==="list"} onClick={()=>setView("list")}>List view</button>
   <button type="button" aria-pressed={view==="map"} onClick={()=>setView("map")}>Map view</button>
  </div>}
  {view==="map"?map:<ul aria-label="Evaluated sections">{sections.map(section=><li key={`${section.sectionId}:${section.geometryVersion}`}>
   <button type="button" aria-pressed={section.sectionId===selectedId} onClick={()=>onSelect(section.sectionId)}>
    {section.streetName} · {section.side} side · {section.parkingDisplay?parkingDisplayLabel(section.parkingDisplay):eligibilityLabel(section.eligibility)}
   </button>
   <p>{eligibilityLabel(section.eligibility)}</p>
   <p>{section.startDescription} to {section.endDescription}</p>
  </li>)}</ul>}
  {!sections.length && <p role="status">No matching verified parking sections.</p>}
  {selected?<SectionSheet section={selected} evaluatedAt={evaluatedAt}/>:selectedId?<p role="status">Selected section is absent from these results. Your selection is retained.</p>:null}
 </section>;
}
