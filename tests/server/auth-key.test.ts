import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {NextRequest,NextResponse} from "next/server";
const sdk=vi.hoisted(()=>({createServerClient:vi.fn((...args:unknown[])=>({args}))}));
vi.mock("@supabase/ssr",()=>sdk);
import {createRequestAuth} from "../../src/lib/server/auth";
beforeEach(()=>{vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL","https://fixture.supabase.co");vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY","");vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY","");sdk.createServerClient.mockClear();});
afterEach(()=>vi.unstubAllEnvs());
const create=()=>createRequestAuth(new NextRequest("https://parkmel.example"),new NextResponse());
describe("public Supabase auth key configuration",()=>{
 it("prefers the publishable key over legacy anon",()=>{vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY","sb_publishable_fixture");vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY","legacy-fixture");create();expect(sdk.createServerClient.mock.calls[0][1]).toBe("sb_publishable_fixture");});
 it("retains the legacy anon fallback",()=>{vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY","legacy-fixture");create();expect(sdk.createServerClient.mock.calls[0][1]).toBe("legacy-fixture");});
 it("fails closed without a public key",()=>{expect(create).toThrow("not configured");expect(sdk.createServerClient).not.toHaveBeenCalled();});
});
