import {NextResponse} from "next/server";
import type {NextRequest} from "next/server";
import {createRequestAuth,eligibilityAdapter} from "../../../../lib/server/auth";
import {serverEligibility,canUseProtectedFeatures} from "../../../../lib/server/eligibility";
import {GUEST_COOKIE_NAME,guestStore,requireGuestAllowance} from "../../../../lib/server/guest";
import {sectionService,parseSectionQuery,evaluatedSections} from "../../../../lib/server/sections";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest) {
 const cookies=new NextResponse(null);
 const reply=(body:unknown,status=200)=>{
  const result=NextResponse.json(body,{status,headers:{"Cache-Control":"private, no-store","Vary":"Cookie"}});
  for(const cookie of cookies.cookies.getAll()) result.cookies.set(cookie);return result;
 };
 let protectedSession=false;
 let authenticatedClient:ReturnType<typeof createRequestAuth>;
 try {authenticatedClient=createRequestAuth(request,cookies);protectedSession=canUseProtectedFeatures(await serverEligibility(eligibilityAdapter(authenticatedClient)));}
 catch {return reply({error:"Authentication unavailable"},503);}
 let query;
 const now=new Date();
 try {query=parseSectionQuery(request.nextUrl.searchParams,protectedSession,now);}
 catch {return reply({error:"Invalid bounds, stay or guest filter"},400);}
 if(protectedSession){
  try {const {data,error}=await authenticatedClient!.rpc("pilot_section_schedules",{west:query.west,south:query.south,east:query.east,north:query.north});if(error)throw new Error();return reply(evaluatedSections(data,query.stay,now.toISOString(),query.includeUnknown));}
  catch{return reply({error:"Parking publication service unavailable"},503);}
 }
 let service;
 try {service=sectionService();} catch {return reply({error:"Section service unavailable"},503);}
 if(!protectedSession) {
  const secret=process.env.GUEST_SIGNING_SECRET;
  if(!secret) return reply({error:"Guest preview unavailable"},503);
  try {await requireGuestAllowance(guestStore(service),secret,request.cookies.get(GUEST_COOKIE_NAME)?.value??null);}
  catch {return reply({error:"Active guest preview required"},403);}
 }
 try {
  const {data,error}=await service.rpc("server_section_schedules",{west:query.west,south:query.south,east:query.east,north:query.north,
   arrival:query.stay.arrival,departure:query.stay.departure,requested_limit:1000});
  if(error) throw new Error("Projection unavailable");
  return reply(evaluatedSections(data,query.stay,now.toISOString(),query.includeUnknown));
 } catch {return reply({error:"Section evaluation unavailable"},503);}
}
