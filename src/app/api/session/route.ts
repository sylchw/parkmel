import {NextResponse} from "next/server";
import type {NextRequest} from "next/server";
import {createRequestAuth,eligibilityAdapter} from "../../../lib/server/auth";
import {serverEligibility} from "../../../lib/server/eligibility";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest) {
 const response=new NextResponse(null);
 try {
  const session=await serverEligibility(eligibilityAdapter(createRequestAuth(request,response)));
  const result=NextResponse.json(session,{headers:{"Cache-Control":"private, no-store","Vary":"Cookie"}});
  for(const cookie of response.cookies.getAll()) result.cookies.set(cookie);
  return result;
 } catch {
  return NextResponse.json({error:"Sign-in is temporarily unavailable"},{status:503,headers:{"Cache-Control":"private, no-store","Vary":"Cookie"}});
 }
}
