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
  if(session.kind!=="admin")return reply({error:"Confirmed admin sign-in required"},403);
  if(!write){const {data,error}=await client.from("pilot_submission").select("id,section_id,owner_id,payload,submitted_at,status,pilot_street_side(street_name,side,start_description,end_description)").eq("status","pending").order("submitted_at").limit(100);return error?reply({error:"Review queue unavailable"},503):reply({submissions:data?.map(item=>({...item,section:registeredStreetSide(item.section_id)??null}))});}
  if(!request.headers.get("content-type")?.startsWith("application/json"))return reply({error:"JSON required"},415);
  const text=await request.text();if(text.length>8192)return reply({error:"Review too large"},413);
  let body;try{body=JSON.parse(text);}catch{return reply({error:"Invalid JSON"},400);}
  if(typeof body?.id!=="string"||! /^[0-9a-f-]{36}$/i.test(body.id)||!["approve","reject"].includes(body.decision)||(body.reason!==undefined&&typeof body.reason!=="string")||(typeof body.reason==="string"&&body.reason.length>2000))return reply({error:"Select a decision; optional reason must be at most 2000 characters"},400);
  const {error}=await client.rpc("review_pilot_annotation",{submission:body.id,decision:body.decision,reason:body.reason?.trim()??""});
  return error?reply({error:"Review not applied. The section may have changed or already been reviewed; refresh the queue."},409):reply({reviewed:true});
 }catch{return reply({error:"Review service unavailable"},503);}
}
export function GET(request:NextRequest){return handle(request,false);}
export function POST(request:NextRequest){return handle(request,true);}
