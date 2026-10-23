import {NextResponse} from "next/server";
import type {NextRequest} from "next/server";
import {createRequestAuth,safeReturnDestination} from "../../../lib/server/auth";
export const dynamic="force-dynamic";
export async function POST(request:NextRequest) {
 const response=new NextResponse(null,{status:303,headers:{"Cache-Control":"private, no-store"}});
 const origin=request.nextUrl.origin;
 const feedback=(message:string,next="/")=>{
  const url=new URL("/sign-in",origin);url.searchParams.set("message",message);url.searchParams.set("next",next);
  response.headers.set("Location",url.href);return response;
 };
 if(request.headers.get("origin")!==origin) return new NextResponse(null,{status:403,headers:{"Cache-Control":"private, no-store"}});
 let form:FormData;
 try {form=await request.formData();} catch {return feedback("invalid_request");}
 const email=form.get("email"),password=form.get("password"),action=form.get("action");
 const destination=safeReturnDestination(typeof form.get("next")==="string"?form.get("next") as string:null,origin);
 const next=new URL(destination).pathname+new URL(destination).search+new URL(destination).hash;
 if(typeof email!=="string" || email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
  typeof password!=="string" || password.length<8 || password.length>256 || !["signup","signin"].includes(String(action))) return feedback("invalid_credentials",next);
 try {
  const client=createRequestAuth(request,response);
  if(action==="signup") {
   const callback=new URL("/auth/callback",origin);callback.searchParams.set("next",next);
   const result=await client.auth.signUp({email,password,options:{emailRedirectTo:callback.href}});
   if(result.error) return feedback("signup_unavailable",next);
   // Never keep an automatically issued signup session if confirmation is disabled remotely.
   if(result.data.session) await client.auth.signOut();
   return feedback("check_email",next);
  }
  const result=await client.auth.signInWithPassword({email,password});
  if(result.error) return feedback("signin_failed",next);
  const verified=await client.auth.getUser();
  if(verified.error || !verified.data.user?.email_confirmed_at) {
   await client.auth.signOut();return feedback("verify_email",next);
  }
  response.headers.set("Location",destination);return response;
 } catch {return feedback("auth_unavailable",next);}
}
