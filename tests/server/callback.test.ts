import {beforeEach,describe,expect,it,vi} from "vitest";
import {NextRequest} from "next/server";
const sdk=vi.hoisted(()=>({exchange:vi.fn(),create:vi.fn()}));
vi.mock("@supabase/ssr",()=>({createServerClient:sdk.create}));
import {safeReturnDestination} from "../../src/lib/server/auth";
import {GET} from "../../src/app/auth/callback/route";
const origin="https://parkmel.example";
beforeEach(()=>{
 process.env.NEXT_PUBLIC_SUPABASE_URL="https://supabase.example";process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY="local-fixture-public-key";
 sdk.exchange.mockReset().mockResolvedValue({error:null});sdk.create.mockReset().mockReturnValue({auth:{exchangeCodeForSession:sdk.exchange}});
});
describe("provider callback",()=>{
 it.each(["https://evil.example","//evil.example","/\\evil.example","/%2f%2fevil.example","/%5cevil.example","/bad\npath"])("rejects open redirect %s",value=>{
  expect(safeReturnDestination(value,origin)).toBe(`${origin}/`);
 });
 it("preserves safe same-origin return selection without adding personal data",()=>{
  expect(safeReturnDestination("/?section=fixture#draft",origin)).toBe(`${origin}/?section=fixture#draft`);
 });
 it("handles provider cancellation without exchanging a code",async()=>{
  const response=await GET(new NextRequest(`${origin}/auth/callback?error=access_denied`));
  expect(response.headers.get("location")).toBe(`${origin}/?auth=cancelled`);expect(sdk.exchange).not.toHaveBeenCalled();
 });
 it("exchanges PKCE code and keeps return URL private/no-store",async()=>{
  const response=await GET(new NextRequest(`${origin}/auth/callback?code=fixture&next=%2F%3Fsection%3Ds`));
  expect(sdk.exchange).toHaveBeenCalledWith("fixture");expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe(`${origin}/?section=s`);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
 });
 it("retains SDK cookies and refresh cache headers on the actual redirect",async()=>{
  sdk.create.mockImplementation((_url,_key,options)=>{
   options.cookies.setAll([{name:"fixture-session",value:"local-test",options:{path:"/",sameSite:"lax"}}],{Pragma:"no-cache"});
   return {auth:{exchangeCodeForSession:sdk.exchange}};
  });
  const response=await GET(new NextRequest(`${origin}/auth/callback?code=fixture`));
  expect(response.cookies.get("fixture-session")?.value).toBe("local-test");
  expect(response.headers.get("pragma")).toBe("no-cache");
 });
 it("fails closed on missing configuration, missing code and failed exchange",async()=>{
  expect((await GET(new NextRequest(`${origin}/auth/callback`))).headers.get("location")).toContain("missing_code");
  sdk.exchange.mockResolvedValue({error:{message:"private failure"}});
  expect((await GET(new NextRequest(`${origin}/auth/callback?code=x`))).headers.get("location")).toContain("auth=failed");
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  expect((await GET(new NextRequest(`${origin}/auth/callback?code=x`))).headers.get("location")).toContain("auth=unavailable");
 });
});
