import {NextResponse,type NextRequest} from "next/server";
import {createRequestAuth,eligibilityAdapter} from "../../../../lib/server/auth";
import {serverEligibility} from "../../../../lib/server/eligibility";
export const dynamic="force-dynamic";
async function handle(request:NextRequest,write:boolean){const cookies=new NextResponse(null);const reply=(body:unknown,status=200)=>{const response=NextResponse.json(body,{status,headers:{"Cache-Control":"private, no-store","Vary":"Cookie"}});for(const cookie of cookies.cookies.getAll())response.cookies.set(cookie);return response;};
 if(write&&request.headers.get("origin")!==request.nextUrl.origin)return reply({error:"Invalid origin"},403);
 try{const client=createRequestAuth(request,cookies),session=await serverEligibility(eligibilityAdapter(client));if(session.kind!=="admin")return reply({error:"Admin required"},403);
 if(!write){const result=await client.rpc("list_managed_users");return result.error?reply({error:"Users unavailable"},503):reply({users:result.data,self:session.userId});}
 if(!request.headers.get("content-type")?.startsWith("application/json"))return reply({error:"JSON required"},415);const text=await request.text();if(text.length>1024)return reply({error:"Request too large"},413);let body;try{body=JSON.parse(text);}catch{return reply({error:"Invalid JSON"},400);}if(!body||typeof body!=="object"||Array.isArray(body))return reply({error:"Invalid request"},400);if(typeof body.id!=="string"||! /^[0-9a-f-]{36}$/i.test(body.id)||!["user","reviewer","admin"].includes(body.role)||!["eligible","unverified","suspended"].includes(body.eligibility))return reply({error:"Invalid permissions"},400);
 const result=await client.rpc("manage_profile_permissions",{target:body.id,new_role:body.role,new_eligibility:body.eligibility});return result.error?reply({error:"Permissions could not be changed. You cannot edit yourself; eligible users need a confirmed email."},409):reply({saved:true});
 }catch{return reply({error:"User management unavailable"},503);}}
export function GET(request:NextRequest){return handle(request,false);}
export function POST(request:NextRequest){return handle(request,true);}
