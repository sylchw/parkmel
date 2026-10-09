import {NextResponse} from "next/server";
import type {NextRequest} from "next/server";
import {createRequestAuth} from "../../../lib/server/auth";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
 const response=NextResponse.redirect(new URL("/reset-password",request.nextUrl.origin),303);response.headers.set("Cache-Control","private, no-store");
 const fail=()=>{response.headers.set("Location",new URL("/forgot-password?message=expired",request.nextUrl.origin).href);return response;};
 const code=request.nextUrl.searchParams.get("code");if(!code||code.length>2048||request.nextUrl.searchParams.has("error"))return fail();
 try{const client=createRequestAuth(request,response);const {error}=await client.auth.exchangeCodeForSession(code);return error?fail():response;}catch{return fail();}
}
