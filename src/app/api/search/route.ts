import {NextResponse} from "next/server";
import type {NextRequest} from "next/server";
import {createRequestAuth,eligibilityAdapter} from "../../../lib/server/auth";
import {canUseProtectedFeatures,serverEligibility} from "../../../lib/server/eligibility";
import {searchPrecincts,SYNTHETIC_DESTINATIONS} from "../../../domain/search/precinct-search";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest) {
 const response=NextResponse.json({}, {headers:{"Cache-Control":"private, no-store"}});
 function reply(body:unknown,status=200) {
  const result=NextResponse.json(body,{status,headers:response.headers});
  for(const cookie of response.cookies.getAll()) result.cookies.set(cookie);
  return result;
 }
 try {
  const client=createRequestAuth(request,response);
  const session=await serverEligibility(eligibilityAdapter(client));
  if(!canUseProtectedFeatures(session)) return reply({error:"Eligible sign-in required"},403);
 } catch {return reply({error:"Search authentication unavailable"},503);}
 try {
  // Operator-controlled server fixture flag, never a request parameter.
  const destinations=process.env.PARKMEL_SEARCH_FIXTURE==="synthetic"?SYNTHETIC_DESTINATIONS:[];
  return reply(searchPrecincts(request.nextUrl.searchParams.get("q")??"",destinations));
 } catch {return reply({error:"Enter between 2 and 100 characters"},400);}
}
