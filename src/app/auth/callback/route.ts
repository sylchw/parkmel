import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createRequestAuth, safeReturnDestination } from "../../../lib/server/auth";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
 const destination=safeReturnDestination(request.nextUrl.searchParams.get("next"),request.nextUrl.origin);
 const response=NextResponse.redirect(destination,303);
 response.headers.set("Cache-Control","private, no-store");
 const fail=(reason:string)=>{const url=new URL("/",request.nextUrl.origin);url.searchParams.set("auth",reason);
  response.headers.set("Location",url.href);return response;};
 if(request.nextUrl.searchParams.has("error")) return fail("cancelled");
 const code=request.nextUrl.searchParams.get("code");
 if(!code || code.length>2048) return fail("missing_code");
 try {
  const auth=createRequestAuth(request,response);
  const {error}=await auth.auth.exchangeCodeForSession(code);
  if(error) return fail("failed");
  return response;
 } catch { return fail("unavailable"); }
}
