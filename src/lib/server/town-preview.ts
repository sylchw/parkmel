import {unstable_cache} from "next/cache";
import {createClient} from "@supabase/supabase-js";
import {townCentre} from "../map/town-centres";
import {evaluatedSections} from "./sections";
export function previewDay(now:Date){return new Intl.DateTimeFormat("en-CA",{timeZone:"Australia/Melbourne",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);}
async function loadPreview(region:string,day:string){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key)throw new Error("Preview unavailable");
 const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const {data,error}=await client.rpc("town_centre_preview",{region});if(error)throw new Error("Preview unavailable");
 // Cache schedules once for the Melbourne calendar day; evaluate the 15-minute stay per request.
 return {data,day,loadedAt:new Date().toISOString()};
}
const cachedPreview=unstable_cache(loadPreview,["town-centre-preview-v1"],{revalidate:86400});
export async function townPreview(region:string,now=new Date()){
 townCentre(region);const snapshot=await cachedPreview(region,previewDay(now));
 const stay={arrival:now.toISOString(),departure:new Date(now.getTime()+15*60000).toISOString()};
 const evaluated=evaluatedSections(snapshot.data,stay,now.toISOString(),true);
 return {...evaluated,loadedAt:snapshot.loadedAt,preview:true,region,day:snapshot.day};
}
