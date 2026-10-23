import {NextResponse,type NextRequest} from "next/server";
import {createRequestAuth} from "../../../lib/server/auth";
import {COVERAGE_REGIONS} from "../../../lib/map/coverage";
export const dynamic="force-dynamic";
async function handle(request:NextRequest,write:boolean){
 const cookies=new NextResponse(null);const reply=(body:unknown,status=200)=>{const response=NextResponse.json(body,{status,headers:{"Cache-Control":"private, no-store","Vary":"Cookie"}});for(const cookie of cookies.cookies.getAll())response.cookies.set(cookie);return response;};
 if(write&&request.headers.get("origin")!==request.nextUrl.origin)return reply({error:"Invalid origin"},403);
 try{const client=createRequestAuth(request,cookies);const {data,error}=await client.auth.getUser();if(error||!data.user)return reply({error:"Sign in required"},403);
 if(write){if(!request.headers.get("content-type")?.startsWith("application/json"))return reply({error:"JSON required"},415);const text=await request.text();if(text.length>1024)return reply({error:"Settings too large"},413);let body;try{body=JSON.parse(text);}catch{return reply({error:"Invalid JSON"},400);}if(!body||typeof body!=="object"||Array.isArray(body))return reply({error:"Invalid request"},400);if(typeof body.alias!=="string"||body.alias.trim().length<1||body.alias.trim().length>80||!COVERAGE_REGIONS.some(town=>town.id===body.favouriteTown))return reply({error:"Enter a name and choose a favourite town"},400);const saved=await client.rpc("save_profile_settings",{alias:body.alias.trim(),town:body.favouriteTown});return saved.error?reply({error:"Settings could not be saved"},503):reply({saved:true});}
 const profile=await client.from("profile").select("public_alias,favourite_town").eq("id",data.user.id).single();return profile.error?reply({error:"Settings unavailable"},503):reply({alias:profile.data.public_alias,favouriteTown:profile.data.favourite_town??"carnegie",email:data.user.email});
 }catch{return reply({error:"Settings unavailable"},503);}
}
export function GET(request:NextRequest){return handle(request,false);}
export function POST(request:NextRequest){return handle(request,true);}
