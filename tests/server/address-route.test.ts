import {beforeEach,afterEach,it,expect,vi} from "vitest";
import {NextRequest} from "next/server";
const state=vi.hoisted(()=>({kind:"guest",fetch:vi.fn()}));
vi.mock("../../src/lib/server/auth",()=>({createRequestAuth:()=>({}),eligibilityAdapter:()=>({})}));
vi.mock("../../src/lib/server/eligibility",()=>({serverEligibility:async()=>({kind:state.kind}),canUseProtectedFeatures:(session:{kind:string})=>session.kind==="eligible"}));
import {GET} from "../../src/app/api/search/address/route";
beforeEach(()=>{state.kind="guest";state.fetch.mockReset().mockResolvedValue(new Response(JSON.stringify({features:[]}),{status:200}));vi.stubGlobal("fetch",state.fetch);});afterEach(()=>vi.unstubAllGlobals());
it("blocks guest address searches before any geocoder call",async()=>{const response=await GET(new NextRequest("https://parkmel.example/api/search/address?q=123%20Example%20Road"));expect(response.status).toBe(403);expect(state.fetch).not.toHaveBeenCalled();});
it("allows eligible users to call only the fixed geocoder with validated input",async()=>{state.kind="eligible";expect((await GET(new NextRequest("https://parkmel.example/api/search/address?q=https://evil.example"))).status).toBe(400);expect(state.fetch).not.toHaveBeenCalled();const response=await GET(new NextRequest("https://parkmel.example/api/search/address?q=123%20Example%20Road"));expect(response.status).toBe(200);expect(state.fetch.mock.calls[0][0]).toMatch(/^https:\/\/photon\.komoot\.io\/api\//);expect(response.headers.get("cache-control")).toBe("private, no-store");});
