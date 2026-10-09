import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import type { EligibilityAdapter } from "./eligibility";
export function safeReturnDestination(value: string | null, origin: string): string {
 const fallback = new URL("/",origin).href;
 if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\x00-\x1f\x7f]/.test(value)) return fallback;
 try {
  const url = new URL(value,origin);
  let path = url.pathname;
  for(let i=0;i<3;i++) { const decoded=decodeURIComponent(path); if(decoded===path) break; path=decoded; }
  if(url.origin!==new URL(origin).origin || path.startsWith("//") || /[\\\x00-\x1f\x7f]/.test(path)) return fallback;
  return url.href;
 } catch { return fallback; }
}
/** Route-handler cookie adapter; no service-role key and no shared session cache. */
export function createRequestAuth(request: NextRequest, response: NextResponse) {
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url || !key) throw new Error("Auth provider is not configured");
 return createServerClient(url,key,{cookies:{
  getAll:()=>request.cookies.getAll(),
  setAll:(cookies,headers)=>{
   for(const {name,value,options} of cookies) response.cookies.set(name,value,{...options,secure:request.nextUrl.protocol==="https:"});
   for(const [name,value] of Object.entries(headers??{})) response.headers.set(name,value);
   response.headers.set("Cache-Control","private, no-store");
  },
 }});
}
export function eligibilityAdapter(client: ReturnType<typeof createRequestAuth>): EligibilityAdapter {
 return {
  readVerifiedUser:async()=>{
   const {data,error}=await client.auth.getUser();
   if(error || !data.user) return null;
   return {id:data.user.id,emailVerified:!!data.user.email_confirmed_at,
    providerAssertionVerified:data.user.identities?.some(identity=>
      ["google","apple"].includes(identity.provider) && identity.identity_data?.email_verified===true)===true};
  },
  readProfile:async(id)=>{
   const {data,error}=await client.from("profile").select("id,eligibility,role").eq("id",id).maybeSingle();
   if(error) throw new Error("Profile unavailable");return data;
  },
 };
}
