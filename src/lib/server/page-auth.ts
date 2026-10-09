import {cookies} from "next/headers";
import {createServerClient} from "@supabase/ssr";
export async function pageUser(){
 try{const store=await cookies(),url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key)return null;
 const client=createServerClient(url,key,{cookies:{getAll:()=>store.getAll(),setAll:()=>{}}});const {data,error}=await client.auth.getUser();return error?null:data.user;
 }catch{return null;}
}
