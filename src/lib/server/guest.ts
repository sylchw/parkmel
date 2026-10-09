import {createHmac,randomUUID,timingSafeEqual} from "node:crypto";
export const GUEST_COOKIE_NAME="parkmel_preview";
export interface GuestStatus {id:string;remainingMs:number;expiresAt:string}
export interface GuestStore {
 begin(id:string):Promise<void>;
 meter(id:string,foreground:boolean):Promise<GuestStatus|null>;
}
function signature(id:string,secret:string):string {
 if(Buffer.byteLength(secret)<32) throw new Error("Guest signing secret must have at least 32 bytes");
 return createHmac("sha256",secret).update(id).digest("base64url");
}
export function signGuestIdentifier(id:string,secret:string):string {return `${id}.${signature(id,secret)}`;}
export function verifyGuestIdentifier(cookie:string,secret:string):string|null {
 const match=/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.([A-Za-z0-9_-]{43})$/.exec(cookie);
 if(!match) return null;
 const expected=Buffer.from(signature(match[1],secret)), supplied=Buffer.from(match[2]);
 return expected.length===supplied.length && timingSafeEqual(expected,supplied) ? match[1] : null;
}
export async function beginGuestPreview(store:GuestStore,secret:string,cookie:string|null=null) {
 if(cookie!==null) {
  const id=verifyGuestIdentifier(cookie,secret);if(!id) throw new Error("Invalid guest identifier");
  return {cookie,status:await requireGuestAllowance(store,secret,cookie)};
 }
 const id=randomUUID(),signed=signGuestIdentifier(id,secret);await store.begin(id);
 return {cookie:signed,status:await requireGuestAllowance(store,secret,signed)};
}
export async function requireGuestAllowance(store:GuestStore,secret:string,cookie:string|null,foreground=true):Promise<GuestStatus> {
 const id=cookie ? verifyGuestIdentifier(cookie,secret) : null;
 if(!id) throw new Error("Guest identifier required");
 const status=await store.meter(id,foreground);
 if(!status || status.id!==id || !Number.isSafeInteger(status.remainingMs) || status.remainingMs<=0 ||
    status.remainingMs>120000 || !Number.isFinite(Date.parse(status.expiresAt))) throw new Error("Guest preview expired or unavailable");
 return status;
}
export interface GuestRpc {
 rpc(name:string,args:Record<string,unknown>):PromiseLike<{data:unknown;error:unknown}>;
}
/** Server-only service-role RPC transport, never a browser/public-key client. */
export function guestStore(client:GuestRpc):GuestStore {
 return {
  begin:async id=>{const result=await client.rpc("begin_guest_preview",{identifier:id});if(result.error) throw new Error("Guest store unavailable");},
  meter:async(id,foreground)=>{
   const result=await client.rpc("meter_guest_preview",{identifier:id,active:foreground});if(result.error) throw new Error("Guest store unavailable");
   const row=Array.isArray(result.data) ? result.data[0] : null;
   if(!row || typeof row.guest_id!=="string" || typeof row.remaining_ms!=="number" || typeof row.expires_at!=="string") return null;
   return {id:row.guest_id,remainingMs:row.remaining_ms,expiresAt:row.expires_at};
  },
 };
}
