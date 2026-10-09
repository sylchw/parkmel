import {NextResponse} from "next/server";
import type {NextRequest} from "next/server";
import {createRequestAuth,eligibilityAdapter} from "../../../lib/server/auth";
import {canUseProtectedFeatures,serverEligibility} from "../../../lib/server/eligibility";
import {validateAnnotationDraft} from "../../../domain/community/draft";
import {coverageAt} from "../../../lib/map/coverage";
export const dynamic="force-dynamic";
async function handle(request:NextRequest,write:boolean) {
 const cookies=new NextResponse(null);
 const reply=(body:unknown,status=200)=>{
  const result=NextResponse.json(body,{status,headers:{"Cache-Control":"private, no-store","Vary":"Cookie"}});
  for(const cookie of cookies.cookies.getAll()) result.cookies.set(cookie);return result;
 };
 if(write&&request.headers.get("origin")!==request.nextUrl.origin)return reply({error:"Invalid origin"},403);
 try {
  const client=createRequestAuth(request,cookies);
  const session=await serverEligibility(eligibilityAdapter(client));
  if(!canUseProtectedFeatures(session))return reply({error:"Eligible sign-in required"},403);
  if(!write){
   const {data,error}=await client.from("annotation_draft").select("id,payload,longitude,latitude,updated_at").eq("owner_id",session.userId!).order("updated_at",{ascending:false}).limit(20);
   return error?reply({error:"Draft storage unavailable"},503):reply({drafts:data});
  }
  if(!request.headers.get("content-type")?.startsWith("application/json"))return reply({error:"JSON required"},415);
  const text=await request.text();if(new TextEncoder().encode(text).length>65536)return reply({error:"Draft too large"},413);
  let body;try{body=JSON.parse(text);}catch{return reply({error:"Invalid draft"},400);}
  const draft=body?.draft,coordinates=body?.coordinates;
  if(!draft||typeof draft.sectionId!=="string"||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(draft.sectionId)||
   !validateAnnotationDraft(draft,{sectionId:draft.sectionId,geometryVersion:draft.geometryVersion}).validDraft||
   !coordinates||!Number.isFinite(coordinates.longitude)||!Number.isFinite(coordinates.latitude)||!coverageAt([coordinates.longitude,coordinates.latitude]))return reply({error:"Invalid draft or pilot location"},400);
  const {error}=await client.from("annotation_draft").upsert({owner_id:session.userId,id:draft.sectionId,payload:draft,longitude:coordinates.longitude,latitude:coordinates.latitude,updated_at:new Date().toISOString()},{onConflict:"owner_id,id"});
  return error?reply({error:"Draft storage unavailable"},503):reply({saved:true,published:false});
 }catch{return reply({error:"Draft service unavailable"},503);}
}
export function GET(request:NextRequest){return handle(request,false);}
export function POST(request:NextRequest){return handle(request,true);}
