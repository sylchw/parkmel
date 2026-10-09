import {beforeEach,describe,expect,it,vi} from "vitest";
import {NextRequest} from "next/server";
import {searchPrecincts,SYNTHETIC_DESTINATIONS} from "../../src/domain/search/precinct-search";
const auth=vi.hoisted(()=>({user:null as unknown,profile:null as unknown}));
vi.mock("../../src/lib/server/auth",()=>({createRequestAuth:()=>({}),eligibilityAdapter:()=>({readVerifiedUser:async()=>auth.user,readProfile:async()=>auth.profile})}));
import {GET} from "../../src/app/api/search/route";
const id="11111111-1111-4111-8111-111111111111";
beforeEach(()=>{auth.user=null;auth.profile=null;vi.unstubAllEnvs();});
function eligible(){auth.user={id,emailVerified:true};auth.profile={id,eligibility:"eligible",role:"user"};}
describe("curated destination search",()=>{
 it("matches aliases and marks invented coverage",()=>{
  const result=searchPrecincts(" ＤＥＭＯ ",SYNTHETIC_DESTINATIONS);
  expect(result.destinations).toHaveLength(1);expect(result.destinations[0].synthetic).toBe(true);
  expect(result.destinations[0].label).toContain("synthetic example");
 });
 it("explains empty coverage and unmatched curated queries",()=>{
  expect(searchPrecincts("demo",[]).coverage).toBe("empty");
  expect(searchPrecincts("unmatched",SYNTHETIC_DESTINATIONS).destinations).toEqual([]);
 });
 it("bounds untrusted queries",()=>{for(const query of ["","a","x".repeat(101)]) expect(()=>searchPrecincts(query,[])).toThrow();});
 it("denies direct guest requests even with client role and fixture flags",async()=>{
  const response=await GET(new NextRequest("http://localhost/api/search?q=demo&role=admin&fixture=synthetic"));
  expect(response.status).toBe(403);expect(response.headers.get("cache-control")).toBe("private, no-store");
 });
 it("denies unverified users",async()=>{
  auth.user={id,emailVerified:false};auth.profile={id,eligibility:"eligible",role:"admin"};
  expect((await GET(new NextRequest("http://localhost/api/search?q=demo"))).status).toBe(403);
 });
 it("defaults to explicit empty operator coverage for eligible sessions",async()=>{
  eligible();const response=await GET(new NextRequest("http://localhost/api/search?q=demo&fixture=synthetic"));
  expect(response.status).toBe(200);expect((await response.json()).coverage).toBe("empty");
 });
 it("only enables labelled synthetic data with the operator server flag",async()=>{
  eligible();vi.stubEnv("PARKMEL_SEARCH_FIXTURE","synthetic");
  const response=await GET(new NextRequest("http://localhost/api/search?q=demo"));
  expect((await response.json()).destinations[0].synthetic).toBe(true);
 });
 it("returns bounded validation errors after eligibility",async()=>{
  eligible();expect((await GET(new NextRequest("http://localhost/api/search?q=a"))).status).toBe(400);
 });
});
