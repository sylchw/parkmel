import {beforeEach,describe,expect,it,vi} from "vitest";
import {NextRequest} from "next/server";
const mock=vi.hoisted(()=>({eligibility:vi.fn(),upsert:vi.fn(),from:vi.fn(),auth:vi.fn()}));
vi.mock("../../src/lib/server/auth",()=>({createRequestAuth:mock.auth,eligibilityAdapter:()=>({})}));
vi.mock("../../src/lib/server/eligibility",async original=>({...await original<typeof import("../../src/lib/server/eligibility")>(),serverEligibility:mock.eligibility}));
import {GET as session} from "../../src/app/api/session/route";
import {POST} from "../../src/app/api/drafts/route";
const id="00000000-0000-0000-0000-000000000081";
const draft={schemaVersion:1,sectionId:id,geometryVersion:1,side:"unknown",startDescription:"",endDescription:"",allPanelsAndBoundariesChecked:false,panels:[],schedule:null};
function request(body:unknown,origin="https://parkmel.test"){return new NextRequest("https://parkmel.test/api/drafts",{method:"POST",headers:{origin,"content-type":"application/json"},body:JSON.stringify(body)});}
beforeEach(()=>{vi.clearAllMocks();mock.eligibility.mockResolvedValue({kind:"eligible",userId:id,reason:"verified"});mock.auth.mockReturnValue({from:mock.from});mock.from.mockReturnValue({upsert:mock.upsert});mock.upsert.mockResolvedValue({error:null});});
describe("pilot session and private drafts",()=>{
 it("reports server eligibility without caching",async()=>{const result=await session(new NextRequest("https://parkmel.test/api/session"));expect(await result.json()).toEqual({kind:"eligible",userId:id,reason:"verified"});expect(result.headers.get("cache-control")).toBe("private, no-store");});
 it("rejects cross-origin mutation before auth",async()=>{expect((await POST(request({},"https://evil.test"))).status).toBe(403);expect(mock.auth).not.toHaveBeenCalled();});
 it.each(["guest","unverified"])("denies %s annotation writes",async kind=>{mock.eligibility.mockResolvedValue({kind,userId:null});expect((await POST(request({}))).status).toBe(403);expect(mock.upsert).not.toHaveBeenCalled();});
 it("accepts incomplete private drafts without trusting supplied owner",async()=>{const result=await POST(request({draft,coordinates:{longitude:145.056,latitude:-37.886},owner_id:"forged"}));expect(result.status).toBe(200);expect(mock.upsert.mock.calls[0][0].owner_id).toBe(id);expect(await result.json()).toEqual({saved:true,published:false});});
 it("rejects locations outside pilot bounds",async()=>{expect((await POST(request({draft,coordinates:{longitude:0,latitude:0}}))).status).toBe(400);expect(mock.upsert).not.toHaveBeenCalled();});
 it("rejects oversized draft payloads",async()=>{expect((await POST(request({draft,padding:"x".repeat(66000)}))).status).toBe(413);expect(mock.upsert).not.toHaveBeenCalled();});
 it("fails closed when storage is unavailable",async()=>{mock.upsert.mockResolvedValue({error:{message:"private db error"}});const result=await POST(request({draft,coordinates:{longitude:145.056,latitude:-37.886}}));expect(result.status).toBe(503);expect(await result.text()).not.toContain("private db error");});
});
