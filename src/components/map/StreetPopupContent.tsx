"use client";
import {streetViewUrl} from "../../lib/map/street-view-url";
export interface StreetPopupInfo {key:string;signedRules?:import("../../lib/map/signed-rule-summary").SignedRuleSummary[];streetName:string;ruleLabel:string;unknown:boolean;longitude:number;latitude:number;sectionId?:string;boundaryLabel?:string}
export function annotationReturnPath(longitude:number,latitude:number,sectionId?:string):string {
 // The Street View helper validates the same coordinates before creating links.
 streetViewUrl(longitude,latitude);
 return `/?longitude=${longitude}&latitude=${latitude}${sectionId?`&sectionId=${encodeURIComponent(sectionId)}`:""}#annotations`;
}
export default function StreetPopupContent({info,guest,onContribute,onDetails}:{info:StreetPopupInfo;guest:boolean;onContribute?:()=>void;onDetails?:()=>void}) {
 const streetView=streetViewUrl(info.longitude,info.latitude);
 const signIn=`/sign-in?next=${encodeURIComponent(annotationReturnPath(info.longitude,info.latitude,info.sectionId))}`;
 return <section className="street-popup-box" aria-label="Street parking information">
  <h2>{info.streetName}</h2>{info.boundaryLabel&&<p>{info.boundaryLabel}. Left/right is looking from start to end.</p>}
  {info.signedRules?.map((rule,index)=><p key={index}><strong className={rule.active===true?"signed-rule-active":"signed-rule-inactive"}>{rule.label}{rule.active===null?" · applicability unconfirmed":""}</strong></p>)}
  {info.unknown?<><p>Help add this street’s parking rules.</p>
   {guest?<a className="street-popup-action" href={signIn}>Sign in to contribute parking details</a>:<a className="street-popup-action" href="#annotations" onClick={onContribute}>Contribute parking details</a>}
   <p><a href={streetView} target="_blank" rel="noopener noreferrer">View parking street signs in Google Maps Street View ↗</a></p>
   <p className="street-popup-note">Check the image date; signs may have changed or may not be visible.</p>
  </>:<><p>{info.ruleLabel}</p>{onDetails&&<button type="button" onClick={onDetails}>View section details</button>}</>}
 </section>;
}
