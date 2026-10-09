import {describe,expect,it} from "vitest";
import {serverEligibility,canUseProtectedFeatures} from "../../src/lib/server/eligibility";
const id="00000000-0000-0000-0000-000000000071";
const adapter=(user:unknown,profile:unknown)=>({readVerifiedUser:async()=>user,readProfile:async()=>profile});
const user={id,emailVerified:true},profile={id,eligibility:"eligible",role:"user"};
describe("trusted server eligibility",()=>{
 it("denies missing sessions and client-style role/email flags",async()=>{
  expect((await serverEligibility(adapter(null,profile))).kind).toBe("guest");
  expect((await serverEligibility(adapter({id,email:"verified@example.test",role:"admin",verified:true},profile))).kind).toBe("unverified");
 });
 it("requires trusted profile role and eligibility even with verified credential",async()=>{
  expect((await serverEligibility(adapter({...user,role:"admin"},profile))).kind).toBe("eligible");
  expect((await serverEligibility(adapter(user,{...profile,eligibility:"suspended",role:"admin"}))).kind).toBe("unverified");
  expect((await serverEligibility(adapter(user,{...profile,id:"another"}))).kind).toBe("unverified");
 });
 it("supports provider assertions without exposing or requiring an email",async()=>{
  const result=await serverEligibility(adapter({id,providerAssertionVerified:true},{...profile,role:"admin"}));
  expect(result.kind).toBe("admin");expect(canUseProtectedFeatures(result)).toBe(true);
 });
 it("fails closed on session/profile adapter errors",async()=>{
  const session=await serverEligibility({...adapter(user,profile),readVerifiedUser:async()=>{throw Error("offline");}});
  expect(canUseProtectedFeatures(session)).toBe(false);
  const missing=await serverEligibility({...adapter(user,profile),readProfile:async()=>{throw Error("offline");}});
  expect(missing.kind).toBe("unverified");
 });
 it.each([null,{},[],{id:"invalid"},{id,emailVerified:"true"}])("rejects malformed verified-user payload %j",async value=>{
  expect(canUseProtectedFeatures(await serverEligibility(adapter(value,profile)))).toBe(false);
 });
});
