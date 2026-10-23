import {createHmac} from "node:crypto";
import {isIP} from "node:net";
import {sectionService} from "./sections";
export interface ReadBudget {allowed:boolean;daily?:boolean;retryAfter?:number}
export function readBudget(value:unknown):ReadBudget {
 if(!value||typeof value!=="object")throw new Error("Read limits unavailable");
 const data=value as ReadBudget;
 if(data.allowed===true)return {allowed:true};
 if(data.allowed===false&&typeof data.daily==="boolean"&&Number.isSafeInteger(data.retryAfter)&&data.retryAfter!>=1&&data.retryAfter!<=90000)return data;
 throw new Error("Read limits unavailable");
}
export async function consumeReadQuota(subject:string,action:"search"|"preview"){
 const {data,error}=await sectionService().rpc("consume_read_quota",{subject,action});if(error)throw new Error("Read limits unavailable");return readBudget(data);
}
export function quotaMessage(action:string,budget:ReadBudget){return budget.daily?`You've reached today's ${action} allowance. It resets at midnight Melbourne time. Your current map and saved drafts are still available.`:`You're ${action==='address search'?'searching':'browsing'} quickly. Please wait ${budget.retryAfter} seconds before trying again. Your current map remains available.`;}
export function guestQuotaSubject(headers:Headers){
 const secret=process.env.GUEST_SIGNING_SECRET||process.env.SUPABASE_SERVICE_ROLE_KEY;if(!secret||secret.length<32)throw new Error("Preview limits unavailable");
 // Vercel overwrites this header. Local runs share one test budget instead of trusting arbitrary headers.
 const ip=process.env.VERCEL==="1"?headers.get("x-forwarded-for")?.trim():"127.0.0.1";
 if(!ip||!isIP(ip))throw new Error("Preview limits unavailable");
 return `guest:${createHmac("sha256",secret).update(`parkmel-read-quota:${ip}`).digest("hex")}`;
}
