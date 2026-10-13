import {NextResponse,type NextRequest} from "next/server";
import {createRequestAuth,eligibilityAdapter} from "../../../../lib/server/auth";
import {canUseProtectedFeatures,serverEligibility} from "../../../../lib/server/eligibility";
export const dynamic="force-dynamic";
async function handle(request:NextRequest,write:boolean){const cookies=new NextResponse(null);const reply=(body:unknown,status=200)=>{const response=NextResponse.json(body,{status,headers:{"Cache-Control":"private, no-store","Vary":"Cookie"}});for(const cookie of cookies.cookies.getAll())response.cookies.set(cookie);return response;};
if(write&&request.headers.get("origin")!==request.nextUrl.origin)return reply({error:"Invalid origin"},403);
try{const client=createRequestAuth(request,cookies),session=await serverEligibility(eligibilityAdapter(client));if(!canUseProtectedFeatures(session))return reply({error:"Eligible sign-in required"},403);
if(!write){const result=await client.from("pilot_submission").select("id,submitted_at,pilot_street_side(street_name,side,start_description,end_description)").eq("owner_id",session.userId).eq("status","pending").order("submitted_at",{ascending:false}).limit(100);return result.error?reply({error:"Contributions unavailable"},503):reply({submissions:result.data});}
if(!request.headers.get("content-type")?.startsWith("application/json"))return reply({error:"JSON required"},415);const text=await request.text();if(text.length>256)return reply({error:"Request too large"},413);let body;try{body=JSON.parse(text);}catch{return reply({error:"Invalid JSON"},400);}if(!body||typeof body!=="object"||Array.isArray(body))return reply({error:"Invalid request"},400);if(typeof body.id!=="string"||! /^[0-9a-f-]{36}$/i.test(body.id))return reply({error:"Invalid submission"},400);const result=await client.rpc("withdraw_parking_submission",{submission:body.id});return result.error?reply({error:"Only your pending entries can be withdrawn"},409):reply({withdrawn:true});
}catch{return reply({error:"Contributions unavailable"},503);}}
export function GET(request:NextRequest){return handle(request,false);}
export function POST(request:NextRequest){return handle(request,true);}
