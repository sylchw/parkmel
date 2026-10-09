import {NextResponse} from "next/server";
import type {NextRequest} from "next/server";
import {createRequestAuth} from "../../../lib/server/auth";
export const dynamic="force-dynamic";
export async function POST(request:NextRequest){
 const origin=request.nextUrl.origin,response=new NextResponse(null,{status:303,headers:{"Cache-Control":"private, no-store"}});
 const feedback=(path:string,message:string)=>{const url=new URL(path,origin);url.searchParams.set("message",message);response.headers.set("Location",url.href);return response;};
 if(request.headers.get("origin")!==origin)return new NextResponse(null,{status:403,headers:{"Cache-Control":"private, no-store"}});
 let form:FormData;try{form=await request.formData();}catch{return feedback("/forgot-password","invalid");}
 const action=form.get("action");
 if(action==="request"){
  const email=form.get("email");if(typeof email!=="string"||email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email))return feedback("/forgot-password","invalid");
  try{const client=createRequestAuth(request,response),callback=new URL("/auth/recovery",origin);const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:callback.href});return feedback("/forgot-password",error?"unavailable":"sent");}catch{return feedback("/forgot-password","unavailable");}
 }
 if(action!=="update")return feedback("/forgot-password","invalid");
 const password=form.get("password"),confirmation=form.get("confirmation");
 if(typeof password!=="string"||password.length<8||password.length>256||password!==confirmation)return feedback("/reset-password","invalid");
 try{const client=createRequestAuth(request,response);const {data,error}=await client.auth.getUser();if(error||!data.user?.email_confirmed_at)return feedback("/forgot-password","expired");const update=await client.auth.updateUser({password});if(update.error)return feedback("/reset-password","failed");await client.auth.signOut();return feedback("/sign-in","password_updated");}catch{return feedback("/reset-password","failed");}
}
