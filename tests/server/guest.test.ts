import {describe,expect,it,vi} from "vitest";
import {beginGuestPreview,requireGuestAllowance,signGuestIdentifier,verifyGuestIdentifier,guestStore} from "../../src/lib/server/guest";
const secret="local-test-only-signing-key-at-least-32-bytes",id="00000000-0000-0000-0000-000000000071";
const status={id,remainingMs:1000,expiresAt:"2026-11-01T00:00:00Z"};
describe("server guest enforcement",()=>{
 it("detects changed identifiers/signatures and key rotation",()=>{
  const cookie=signGuestIdentifier(id,secret);expect(verifyGuestIdentifier(cookie,secret)).toBe(id);
  expect(verifyGuestIdentifier(cookie.replace("071.","072."),secret)).toBeNull();
  expect(verifyGuestIdentifier(cookie,secret+"rotated")).toBeNull();
  expect(()=>signGuestIdentifier(id,"short")).toThrow();
 });
 it("creates a signed random identifier once and resumes stored allowance",async()=>{
  const records=new Map<string,typeof status>();
  const store={begin:vi.fn(async(key:string)=>{records.set(key,{...status,id:key});}),meter:vi.fn(async(key:string)=>records.get(key)??null)};
  const first=await beginGuestPreview(store,secret);const next=await beginGuestPreview(store,secret,first.cookie);
  expect(next.cookie).toBe(first.cookie);expect(store.begin).toHaveBeenCalledTimes(1);
 });
 it("ignores local timer values and denies expired/absent/tampered requests",async()=>{
  const cookie=signGuestIdentifier(id,secret),store={begin:vi.fn(),meter:vi.fn(async()=>({...status,remainingMs:0}))};
  await expect(requireGuestAllowance(store,secret,cookie)).rejects.toThrow("expired");
  await expect(requireGuestAllowance(store,secret,null)).rejects.toThrow();
  await expect(beginGuestPreview(store,secret,cookie+"tampered")).rejects.toThrow();
  expect(store.begin).not.toHaveBeenCalled();
 });
 it("uses trusted service RPC values and fails closed on invalid payloads",async()=>{
  const rpc={rpc:vi.fn(async()=>({data:[{guest_id:id,remaining_ms:1000,expires_at:status.expiresAt}],error:null}))};
  expect((await requireGuestAllowance(guestStore(rpc),secret,signGuestIdentifier(id,secret))).remainingMs).toBe(1000);
  expect(rpc.rpc).toHaveBeenCalledWith("meter_guest_preview",{identifier:id,active:true});
  rpc.rpc.mockResolvedValue({data:[],error:null});
  await expect(requireGuestAllowance(guestStore(rpc),secret,signGuestIdentifier(id,secret))).rejects.toThrow();
 });
});
