import {NextResponse} from "next/server";
import type {NextRequest} from "next/server";
import {createRequestAuth,safeReturnDestination} from "../../../lib/server/auth";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest) {
 const response=new NextResponse(null,{status:303,headers:{"Cache-Control":"private, no-store"}});
 const origin=request.nextUrl.origin;
 const provider=request.nextUrl.searchParams.get("provider");
 const next=safeReturnDestination(request.nextUrl.searchParams.get("next"),origin);
 const fail=(reason:string)=>{
  const destination=new URL(next);destination.searchParams.set("auth",reason);
  response.headers.set("Location",destination.href);return response;
 };
 if(provider!=="google" && provider!=="apple") return fail("unsupported_provider");
 try {
  const callback=new URL("/auth/callback",origin);
  callback.searchParams.set("next",new URL(next).pathname+new URL(next).search+new URL(next).hash);
  const client=createRequestAuth(request,response);
  const {data,error}=await client.auth.signInWithOAuth({provider,options:{redirectTo:callback.href,skipBrowserRedirect:true}});
  if(error || !data.url || new URL(data.url).protocol!=="https:") return fail("sign_in_unavailable");
  response.headers.set("Location",data.url);return response;
 } catch {return fail("sign_in_unavailable");}
}
