import {NextResponse,type NextRequest} from "next/server";
import {createRequestAuth,eligibilityAdapter} from "../../../lib/server/auth";
import {canUseProtectedFeatures,serverEligibility} from "../../../lib/server/eligibility";
import {validateAnnotationDraft} from "../../../domain/community/draft";
import type {ParkingSchedule} from "../../../domain/parking/types";
import {registeredStreetSide} from "../../../lib/server/street-registry";
export const dynamic="force-dynamic";
export async function POST(request:NextRequest){
 const cookies=new NextResponse(null);
 const reply=(body:unknown,status=200)=>{const response=NextResponse.json(body,{status,headers:{"Cache-Control":"private, no-store","Vary":"Cookie"}});for(const cookie of cookies.cookies.getAll())response.cookies.set(cookie);return response;};
 if(request.headers.get("origin")!==request.nextUrl.origin)return reply({error:"Invalid origin"},403);
 if(!request.headers.get("content-type")?.startsWith("application/json"))return reply({error:"JSON required"},415);
 try{
  const client=createRequestAuth(request,cookies),session=await serverEligibility(eligibilityAdapter(client));
  if(!canUseProtectedFeatures(session))return reply({error:"Confirmed eligible sign-in required"},403);
  const text=await request.text();if(new TextEncoder().encode(text).length>65536)return reply({error:"Annotation too large"},413);
  let draft;try{draft=JSON.parse(text);}catch{return reply({error:"Invalid JSON"},400);}
  const street=registeredStreetSide(draft?.sectionId);
  if(!street)return reply({error:"Select a registered street side first"},400);
  const rules=(draft?.schedule as ParkingSchedule)?.rules;
  const checked=validateAnnotationDraft(draft,{sectionId:street.id,geometryVersion:street.properties.geometryVersion},Array.isArray(rules)?rules.filter(rule=>rule?.source?.evidenceKind==="street_view").map(rule=>rule.source.identifier):[]);
  if(!checked.publishable||draft.side!==street.properties.side||draft.startDescription!==street.properties.startDescription||draft.endDescription!==street.properties.endDescription||draft.schedule.verification!=="unverified"||draft.schedule.confidenceLevel!==1||draft.schedule.lastVerifiedAt!==null||draft.schedule.changeState!=="none")return reply({error:"Complete the registered side, boundaries, panels and unverified schedule",requirements:checked.errors},400);
  const {data,error}=await client.rpc("submit_pilot_annotation",{p:draft});
  return error?reply({error:"Submission unavailable or rejected by database validation. Your draft is retained."},503):reply({id:data,submitted:true});
 }catch{return reply({error:"Annotation service unavailable"},503);}
}
