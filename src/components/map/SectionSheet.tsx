"use client";
import {parkingDisplayLabel} from "../../lib/map/parking-display";
import type {EvaluatedSection} from "./ResultsList";
import {eligibilityLabel} from "./ResultsList";
export function evidenceAge(observedAt:string,sourceDate:string|null,evaluatedAt:string):string {
 const evidence=Math.min(Date.parse(observedAt),sourceDate?Date.parse(`${sourceDate}T00:00:00Z`):Infinity);
 const elapsed=Date.parse(evaluatedAt)-evidence;
 return !Number.isFinite(elapsed)||elapsed<0?"Age unknown":`${Math.floor(elapsed/86400000)} days old at evaluation`;
}
export default function SectionSheet({section,evaluatedAt}:{section:EvaluatedSection;evaluatedAt:string}) {
 return <aside aria-label="Selected section details">
  <h2>{section.streetName} · {section.side} side</h2>
  <p>{section.startDescription} to {section.endDescription}</p>
  {(section.localZones??[]).map((zone,index)=><p key={index}>Local {zone.extent.start*100}–{zone.extent.end*100}%: {parkingDisplayLabel(zone.parkingDisplay)}. {zone.explanation}</p>)}
  {section.parkingDisplay&&<p>{parkingDisplayLabel(section.parkingDisplay)}</p>}
  <p>{eligibilityLabel(section.eligibility)}</p>
  <p>{section.explanation}</p>
  <p>Reasons: {section.reasonCodes.join(", ").replaceAll("_"," ")}</p>
  <p>Confidence: {section.confidenceLevel===null?"Unknown":`${section.confidenceLevel}/5`}. Confidence describes evidence agreement, not freshness or legal certainty.</p>
  <p>Last verified: {section.lastVerifiedAt??"Unknown"}</p>
  {section.sourceDates.length?<ul aria-label="Sign evidence ages">{section.sourceDates.map((source,index)=><li key={index}>
   {source.evidenceKind.replaceAll("_"," ")} · {evidenceAge(source.observedAt,source.sourceDate,evaluatedAt)} · observed {source.observedAt}
   {source.sourceDate && ` · source dated ${source.sourceDate}`}
  </li>)}</ul>:<p>Source age unknown.</p>}
  {section.earliestTransition && <p>Earliest rule transition: {section.earliestTransition}</p>}
  <p>Space occupancy is unknown. Check current signs and conditions.</p>
 </aside>;
}
