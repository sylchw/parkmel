import {registeredStreetSide} from "../../../../lib/server/street-registry";
import {NextResponse,type NextRequest} from "next/server";
import {createRequestAuth,eligibilityAdapter} from "../../../../lib/server/auth";
import {serverEligibility} from "../../../../lib/server/eligibility";
export const dynamic="force-dynamic";
async function handle(request:NextRequest,write:boolean){
 const cookies=new NextResponse(null);
 const reply=(body:unknown,status=200)=>{const response=NextResponse.json(body,{status,headers:{"Cache-Control":"private, no-store","Vary":"Cookie"}});for(const cookie of cookies.cookies.getAll())response.cookies.set(cookie);return response;};
 if(write&&request.headers.get("origin")!==request.nextUrl.origin)return reply({error:"Invalid origin"},403);
 try{
  const client=createRequestAuth(request,cookies),session=await serverEligibility(eligibilityAdapter(client));
  if(session.kind!=="admin"&&session.kind!=="reviewer")return reply({error:"Confirmed admin sign-in required"},403);
  if(!write){
   const {data,error}=await client.from("pilot_submission").select("id,section_id,owner_id,payload,submitted_at,status,base_revision,pilot_street_side(street_name,side,start_description,end_description)").eq("status","pending").order("submitted_at").limit(100);
   if(error)return reply({error:"Review queue unavailable"},503);
   if(!data?.length)return reply({submissions:[]});
   const {data:publications,error:publicationError}=await client.from("pilot_publication").select("section_id,submission_id,verification,current:pilot_submission!pilot_publication_submission_id_fkey(payload)").in("section_id",[...new Set(data.map(item=>item.section_id))]);
   if(publicationError)return reply({error:"Published-rule comparison unavailable"},503);
   return reply({submissions:data.map(item=>({...item,currentPublication:publications?.find(publication=>publication.section_id===item.section_id)??null,section:registeredStreetSide(item.section_id)??null}))});
  }
  if(!request.headers.get("content-type")?.startsWith("application/json"))return reply({error:"JSON required"},415);
  const text=await request.text();if(text.length>8192)return reply({error:"Review too large"},413);
  let body;try{body=JSON.parse(text);}catch{return reply({error:"Invalid JSON"},400);}
  if(typeof body?.id!=="string"||! /^[0-9a-f-]{36}$/i.test(body.id)||!["approve","reject"].includes(body.decision)||(body.reason!==undefined&&typeof body.reason!=="string")||(typeof body.reason==="string"&&body.reason.length>2000))return reply({error:"Select a decision; optional reason must be at most 2000 characters"},400);
  if(body.expectedRevision!==undefined&&body.expectedRevision!==null&&(typeof body.expectedRevision!=="string"||! /^[0-9a-f-]{36}$/i.test(body.expectedRevision)))return reply({error:"Invalid published revision"},400);
  const {error}=await client.rpc("review_pilot_annotation_current",{submission:body.id,decision:body.decision,reason:body.reason?.trim()??"",expected_revision:body.expectedRevision??null});
  return error?reply({error:"Published rules or the review decision changed. Reload the queue and compare the current rules before trying again."},409):reply({reviewed:true});
 }catch{return reply({error:"Review service unavailable"},503);}
}
export function GET(request:NextRequest){return handle(request,false);}
export function POST(request:NextRequest){return handle(request,true);}
