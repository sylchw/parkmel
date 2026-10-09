import {beforeEach,describe,expect,it,vi} from "vitest";
import {parseSectionQuery,evaluatedSections} from "../../src/lib/server/sections";
const now=new Date("2026-10-07T00:00:00Z");
const stay={arrival:now.toISOString(),departure:"2026-10-07T00:45:00Z"};
const params=()=>new URLSearchParams({west:"145.055",east:"145.057",south:"-37.887",north:"-37.885",...stay});
function row(){return {sectionId:"fixture",geometryVersion:1,side:"left",streetName:"Invented street",startDescription:"A",endDescription:"B",
 geometry:{type:"LineString",coordinates:[[145.056,-37.886],[145.056,-37.885]]},private_evidence_reference:"secret",
 schedule:{schemaVersion:1,sectionId:"fixture",geometryVersion:1,completeness:"complete",coverage:"full_schedule",verification:"admin_verified",confidenceLevel:3,lastVerifiedAt:now.toISOString(),changeState:"none",
 rules:[{id:"private-rule",type:"free",periods:[{dayOfWeek:3,startTime:0,endTime:1440}],feeStatus:"free",permitCondition:"none",holidayPolicy:"applies",
 source:{type:"community",identifier:"private-source",reference:"private-reference",evidenceKind:"field",observedAt:now.toISOString(),submittedAt:now.toISOString(),sourceDate:null}}]}};}
describe("bounded public section evaluation",()=>{
 it("accepts small bounds and rejects oversized, missing, reversed or nonfinite bounds",()=>{
  expect(parseSectionQuery(params(),true,now).west).toBe(145.055);
  for(const [key,value] of [["west",""],["west","Infinity"],["east","144"],["east","146"]]) {
   const p=params();p.set(key,value);expect(()=>parseSectionQuery(p,true,now)).toThrow();
  }
 });
 it("limits guests to server-now 15 minute stays and default filters",()=>{
  expect(()=>parseSectionQuery(params(),false,now)).toThrow();
  const p=params();p.delete("arrival");p.delete("departure");
  expect(Date.parse(parseSectionQuery(p,false,now).stay.departure)).toBe(now.getTime()+15*60000);
  p.set("includeUnknown","true");expect(()=>parseSectionQuery(p,false,now)).toThrow();
 });
 it("evaluates full stay and redacts evidence and rule identifiers",()=>{
  const result=evaluatedSections({sections:[row()]},stay,now.toISOString());
  expect(result.sections[0].eligibility).toBe("eligible_free");
  expect(result.sections[0].parkingDisplay).toEqual({category:"untimed",payment:"free",maxDurationMinutes:null,stayExceeded:false});
  expect(JSON.stringify(result)).not.toMatch(/private-rule|private-source|private-reference|secret/);
 });
 it("retains the signed weekday schedule outside its hours without leaking private evidence",()=>{
  const r=row();Object.assign(r.schedule.rules[0],{type:"time_limit",maxDurationMinutes:120,periods:[1,2,3,4,5].map(dayOfWeek=>({dayOfWeek,startTime:480,endTime:1080}))});
  const saturday={arrival:"2026-10-10T10:00:00+11:00",departure:"2026-10-10T10:15:00+11:00"};
  const section=evaluatedSections({sections:[r]},saturday,now.toISOString(),true).sections[0];
  expect(section.parkingDisplay.category).toBe("untimed");
  expect(section.signedRules).toEqual([{label:"2P · Mon–Fri only · 8am–6pm",active:false}]);
  expect(JSON.stringify(section)).not.toMatch(/private-rule|private-source|private-reference/);
 });
 it("excludes unknown, stale and disputed by default while allowing explicit eligible inspection",()=>{
  for(const modify of [(r:ReturnType<typeof row>)=>{r.schedule.changeState="disputed";},(r:ReturnType<typeof row>)=>{r.schedule.rules[0].source.observedAt="2020-01-01T00:00:00Z";},(r:ReturnType<typeof row>)=>{r.schedule.sectionId="other";}]) {
   const r=row();modify(r);expect(evaluatedSections({sections:[r]},stay,now.toISOString()).sections).toEqual([]);
   expect(evaluatedSections({sections:[r]},stay,now.toISOString(),true).sections[0].eligibility).toBe("unknown");
  }
 });
 it("never exposes malformed geometry or unbounded projections",()=>{
  const r=row();r.geometry.coordinates=[[200,0],[201,0]];
  expect(evaluatedSections({sections:[r]},stay,now.toISOString(),true).sections).toEqual([]);
  expect(()=>evaluatedSections({sections:Array(1001).fill(row())},stay,now.toISOString())).toThrow();
 });
});

const adapter=vi.hoisted(()=>({user:null as unknown,profile:null as unknown,rpc:vi.fn()}));
vi.mock("../../src/lib/server/auth",()=>({createRequestAuth:()=>({rpc:adapter.rpc}),eligibilityAdapter:()=>({readVerifiedUser:async()=>adapter.user,readProfile:async()=>adapter.profile})}));
vi.mock("../../src/lib/server/sections",async original=>({...await original<typeof import("../../src/lib/server/sections")>(),sectionService:()=>({rpc:adapter.rpc})}));
import {NextRequest} from "next/server";
import {GET} from "../../src/app/api/map/sections/route";
import {signGuestIdentifier} from "../../src/lib/server/guest";
const guestId="11111111-1111-4111-8111-111111111111",secret="a".repeat(32);
beforeEach(()=>{adapter.user=null;adapter.profile=null;adapter.rpc.mockReset();vi.unstubAllEnvs();vi.stubEnv("GUEST_SIGNING_SECRET",secret);});
const request=(p=params(),cookie?:string)=>new NextRequest(`https://parkmel.example/api/map/sections?${p}`,{headers:cookie?{cookie:`parkmel_preview=${cookie}`}:{}});
const guestParams=()=>{const p=params();p.delete("arrival");p.delete("departure");return p;};
describe("section endpoint entitlement",()=>{
 it("denies a guest without signed allowance and never fetches projection",async()=>{
  const response=await GET(request(guestParams()));expect(response.status).toBe(403);expect(adapter.rpc).not.toHaveBeenCalled();
  expect(response.headers.get("cache-control")).toBe("private, no-store");
 });
 it("denies expired server allowance even with a valid signature",async()=>{
  adapter.rpc.mockResolvedValue({data:[{guest_id:guestId,remaining_ms:0,expires_at:"2026-11-07T00:00:00Z"}],error:null});
  expect((await GET(request(guestParams(),signGuestIdentifier(guestId,secret)))).status).toBe(403);
  expect(adapter.rpc.mock.calls.map(call=>call[0])).toEqual(["meter_guest_preview"]);
 });
 it("meters active guests before bounded projection and never accepts custom stay",async()=>{
  adapter.rpc.mockImplementation(async(name:string)=>({data:name==="meter_guest_preview"?[{guest_id:guestId,remaining_ms:10000,expires_at:"2026-11-07T00:00:00Z"}]:{sections:[],truncated:false},error:null}));
  const cookie=signGuestIdentifier(guestId,secret);
  const response=await GET(request(guestParams(),cookie));expect(response.status).toBe(200);
  expect(adapter.rpc.mock.calls.map(call=>call[0])).toEqual(["meter_guest_preview","server_section_schedules"]);
  expect((await GET(request(params(),cookie))).status).toBe(400);
 });
 it("allows trusted eligible sessions and handles failed projection privately",async()=>{
  adapter.user={id:guestId,emailVerified:true};adapter.profile={id:guestId,eligibility:"eligible",role:"user"};
  adapter.rpc.mockResolvedValue({data:{sections:[],truncated:false},error:null});
  const response=await GET(request());expect(response.status).toBe(200);expect(response.headers.get("vary")).toBe("Cookie");
  expect(adapter.rpc.mock.calls[0][0]).toBe("pilot_section_schedules");
  adapter.rpc.mockResolvedValue({data:null,error:{message:"secret"}});
  const failed=await GET(request());expect(failed.status).toBe(503);expect(await failed.text()).not.toContain("secret");
 });
});
