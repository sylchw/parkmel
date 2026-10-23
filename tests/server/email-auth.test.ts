import {beforeEach,describe,expect,it,vi} from "vitest";
import {NextRequest} from "next/server";
const auth=vi.hoisted(()=>({signUp:vi.fn(),signInWithPassword:vi.fn(),getUser:vi.fn(),signOut:vi.fn()}));
vi.mock("../../src/lib/server/auth",async original=>({...await original<typeof import("../../src/lib/server/auth")>(),createRequestAuth:()=>({auth})}));
import {POST} from "../../src/app/auth/email/route";
beforeEach(()=>{vi.clearAllMocks();auth.signUp.mockResolvedValue({data:{session:null},error:null});auth.signInWithPassword.mockResolvedValue({error:null});auth.getUser.mockResolvedValue({data:{user:{email_confirmed_at:"2026-10-08"}},error:null});});
function request(action="signin",next="/?section=left",origin="https://parkmel.example") {
 return new NextRequest("https://parkmel.example/auth/email",{method:"POST",headers:{origin,"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({action,next,email:"fixture@example.test",password:"test-password"})});
}
describe("verified email sign-in",()=>{
 it("rejects cross-origin posts before authentication",async()=>{expect((await POST(request("signin","/","https://evil.example"))).status).toBe(403);expect(auth.signInWithPassword).not.toHaveBeenCalled();});
 it("retains safe selection after verified sign-in",async()=>{const response=await POST(request());expect(response.headers.get("location")).toBe("https://parkmel.example/?section=left");expect(response.headers.get("cache-control")).toBe("private, no-store");});
 it("rejects external return URLs",async()=>{expect((await POST(request("signin","https://evil.example"))).headers.get("location")).toBe("https://parkmel.example/");});
 it("signs out unverified sessions",async()=>{auth.getUser.mockResolvedValue({data:{user:{email_confirmed_at:null}},error:null});expect((await POST(request())).headers.get("location")).toContain("verify_email");expect(auth.signOut).toHaveBeenCalled();});
 it("uses PKCE callback for email confirmation",async()=>{expect((await POST(request("signup"))).headers.get("location")).toContain("check_email");expect(auth.signUp.mock.calls[0][0].options.emailRedirectTo).toContain("/auth/callback?next=");});
 it("removes unexpected immediate signup sessions",async()=>{auth.signUp.mockResolvedValue({data:{session:{}},error:null});await POST(request("signup"));expect(auth.signOut).toHaveBeenCalled();});
 it("does not expose provider errors or passwords",async()=>{auth.signInWithPassword.mockResolvedValue({error:{message:"private provider detail"}});const response=await POST(request());expect(response.headers.get("location")).toContain("signin_failed");expect(response.headers.get("location")).not.toMatch(/private|test-password/);});
});
