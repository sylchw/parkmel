import {beforeEach,afterEach,it,expect,vi} from "vitest";
import {NextRequest} from "next/server";
const state=vi.hoisted(()=>({kind:"guest",fetch:vi.fn()}));
vi.mock("../../src/lib/server/auth",()=>({createRequestAuth:()=>({}),eligibilityAdapter:()=>({})}));
vi.mock("../../src/lib/server/eligibility",()=>({serverEligibility:async()=>({kind:state.kind}),canUseProtectedFeatures:(session:{kind:string})=>session.kind==="eligible"}));
const quota=vi.hoisted(()=>vi.fn());
vi.mock("../../src/lib/server/read-quota",async original=>({...await original<typeof import("../../src/lib/server/read-quota")>(),consumeReadQuota:quota}));
import {GET} from "../../src/app/api/search/address/route";
beforeEach(()=>{state.kind="guest";quota.mockReset().mockResolvedValue({allowed:true});state.fetch.mockReset().mockResolvedValue(new Response(JSON.stringify({features:[]}),{status:200}));vi.stubGlobal("fetch",state.fetch);});afterEach(()=>vi.unstubAllGlobals());
it("blocks guest address searches before any geocoder call",async()=>{const response=await GET(new NextRequest("https://parkmel.example/api/search/address?q=123%20Example%20Road"));expect(response.status).toBe(403);expect(state.fetch).not.toHaveBeenCalled();});
it("allows eligible users to call only the fixed geocoder with validated input",async()=>{state.kind="eligible";expect((await GET(new NextRequest("https://parkmel.example/api/search/address?q=https://evil.example"))).status).toBe(400);expect(state.fetch).not.toHaveBeenCalled();const response=await GET(new NextRequest("https://parkmel.example/api/search/address?q=123%20Example%20Road"));expect(response.status).toBe(200);expect(state.fetch.mock.calls[0][0]).toMatch(/^https:\/\/photon\.komoot\.io\/api\//);expect(response.headers.get("cache-control")).toBe("private, no-store");});

it('blocks excessive searches before contacting the geocoder and fails closed',async()=>{state.kind='eligible';quota.mockResolvedValue({allowed:false,daily:true,retryAfter:3600});const response=await GET(new NextRequest('https://parkmel.example/api/search/address?q=123%20Example%20Road'));expect(response.status).toBe(429);expect(response.headers.get('retry-after')).toBe('3600');expect(state.fetch).not.toHaveBeenCalled();quota.mockRejectedValue(new Error('private'));expect((await GET(new NextRequest('https://parkmel.example/api/search/address?q=123%20Example%20Road'))).status).toBe(503);expect(state.fetch).not.toHaveBeenCalled();});
