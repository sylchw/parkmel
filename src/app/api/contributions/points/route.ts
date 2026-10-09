import {NextResponse} from "next/server";
import type {NextRequest} from "next/server";
import {createRequestAuth,eligibilityAdapter} from "../../../../lib/server/auth";
import {canUseProtectedFeatures,serverEligibility} from "../../../../lib/server/eligibility";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
 const cookies=new NextResponse(null);
 const reply=(body:unknown,status=200)=>{const result=NextResponse.json(body,{status,headers:{"Cache-Control":"private, no-store","Vary":"Cookie"}});for(const cookie of cookies.cookies.getAll())result.cookies.set(cookie);return result;};
 try{
  const client=createRequestAuth(request,cookies),session=await serverEligibility(eligibilityAdapter(client));
  if(!canUseProtectedFeatures(session)||!session.userId)return reply({error:"Sign in to view contribution points"},403);
  // Each immutable approved submission counts once, including older approvals and replaced publications.
  // Always use the verified caller's identity; never a user ID supplied in the URL.
  const {count,error}=await client.from("pilot_submission").select("id",{count:"exact",head:true}).eq("owner_id",session.userId).eq("status","approved");
  if(error||count===null||!Number.isSafeInteger(count)||count<0)return reply({error:"Contribution points are temporarily unavailable"},503);
  return reply({points:count});
 }catch{return reply({error:"Contribution points are temporarily unavailable"},503);}
}
