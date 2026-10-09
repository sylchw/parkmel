import {NextResponse} from "next/server";
import type {NextRequest} from "next/server";
import {createRequestAuth,eligibilityAdapter} from "../../../../lib/server/auth";
import {canUseProtectedFeatures,serverEligibility} from "../../../../lib/server/eligibility";
import {addressSearchUrl,addressResults} from "../../../../lib/map/address-search";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
 const cookies=new NextResponse(null);
 const reply=(body:unknown,status=200)=>{const response=NextResponse.json(body,{status,headers:{"Cache-Control":"private, no-store","Vary":"Cookie"}});for(const cookie of cookies.cookies.getAll())response.cookies.set(cookie);return response;};
 try{const client=createRequestAuth(request,cookies);if(!canUseProtectedFeatures(await serverEligibility(eligibilityAdapter(client))))return reply({error:"Sign in to search locations"},403);}catch{return reply({error:"Search authentication unavailable"},503);}
 const query=request.nextUrl.searchParams.get("q")??"";let url:string;try{url=addressSearchUrl(query);}catch{return reply({error:"Enter a street number and road name"},400);}
 try{const response=await fetch(url,{cache:"no-store",signal:AbortSignal.timeout(8000),referrerPolicy:"no-referrer"});if(!response.ok)throw new Error();return reply({results:addressResults(await response.json(),query)});}catch{return reply({error:"Address search is temporarily unavailable"},503);}
}
