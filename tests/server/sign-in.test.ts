import {beforeEach,describe,expect,it,vi} from "vitest";
import {NextRequest} from "next/server";
const sdk=vi.hoisted(()=>({signInWithOAuth:vi.fn()}));
vi.mock("../../src/lib/server/auth",async importOriginal=>{
 const real=await importOriginal<typeof import("../../src/lib/server/auth")>();
 return {...real,createRequestAuth:(_request:unknown,response:{cookies:{set:(name:string,value:string,options:unknown)=>void}})=>{
  response.cookies.set("pkce","fixture-verifier",{httpOnly:true,sameSite:"lax",secure:true});
  return {auth:sdk};
 }};
});
import {GET} from "../../src/app/auth/sign-in/route";
beforeEach(()=>{sdk.signInWithOAuth.mockReset();sdk.signInWithOAuth.mockResolvedValue({data:{url:"https://provider.example/authorize"},error:null});});
describe("OAuth initiation",()=>{
 it.each(["google","apple"])("starts %s with PKCE cookies and retained selection",async provider=>{
  const response=await GET(new NextRequest(`https://parkmel.example/auth/sign-in?provider=${provider}&next=${encodeURIComponent("/?section=left&draft=fixture")}`));
  expect(response.status).toBe(303);expect(response.headers.get("location")).toBe("https://provider.example/authorize");
  expect(response.headers.get("cache-control")).toBe("private, no-store");expect(response.cookies.get("pkce")?.value).toBe("fixture-verifier");
  const options=sdk.signInWithOAuth.mock.calls[0][0];
  expect(options.provider).toBe(provider);expect(new URL(options.options.redirectTo).searchParams.get("next")).toBe("/?section=left&draft=fixture");
 });
 it("rejects unsupported providers without SDK calls",async()=>{
  const result=await GET(new NextRequest("https://parkmel.example/auth/sign-in?provider=password"));
  expect(result.headers.get("location")).toContain("unsupported_provider");expect(sdk.signInWithOAuth).not.toHaveBeenCalled();
 });
 it("rejects external return destinations",async()=>{
  await GET(new NextRequest("https://parkmel.example/auth/sign-in?provider=google&next=https://evil.example"));
  expect(new URL(sdk.signInWithOAuth.mock.calls[0][0].options.redirectTo).searchParams.get("next")).toBe("/");
 });
 it("fails safely without exposing SDK errors",async()=>{
  sdk.signInWithOAuth.mockResolvedValue({data:{url:null},error:{message:"private detail"}});
  const result=await GET(new NextRequest("https://parkmel.example/auth/sign-in?provider=google"));
  expect(result.headers.get("location")).toContain("sign_in_unavailable");expect(result.headers.get("location")).not.toContain("private");
 });
});
