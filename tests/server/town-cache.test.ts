import {beforeEach,afterEach,it,expect,vi} from "vitest";
const state=vi.hoisted(()=>({cache:new Map<string,unknown>(),rpc:vi.fn()}));
vi.mock("next/cache",()=>({unstable_cache:(fn:(...args:string[])=>Promise<unknown>)=>async(...args:string[])=>{const key=JSON.stringify(args);if(!state.cache.has(key))state.cache.set(key,await fn(...args));return state.cache.get(key);}}));
vi.mock("@supabase/supabase-js",()=>({createClient:()=>({rpc:state.rpc})}));
import {townPreview,previewDay} from "../../src/lib/server/town-preview";
beforeEach(()=>{state.cache.clear();state.rpc.mockReset().mockResolvedValue({data:{sections:[],truncated:false},error:null});vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL","https://supabase.example");vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY","fixture-public");});
afterEach(()=>vi.unstubAllEnvs());
it("reuses daily town data while evaluating a current fifteen-minute preview",async()=>{const first=await townPreview("carnegie",new Date("2026-10-09T00:00:00Z"));const second=await townPreview("carnegie",new Date("2026-10-09T02:00:00Z"));expect(state.rpc).toHaveBeenCalledTimes(1);expect(first.stay.arrival).not.toBe(second.stay.arrival);expect(Date.parse(second.stay.departure)-Date.parse(second.stay.arrival)).toBe(900000);await townPreview("carnegie",new Date("2026-10-09T14:00:00Z"));expect(state.rpc).toHaveBeenCalledTimes(2);expect(previewDay(new Date("2026-10-09T14:00:00Z"))).toBe("2026-10-10");});
it("rejects arbitrary towns before generating cache entries or database calls",async()=>{await expect(townPreview("arbitrary")).rejects.toThrow();expect(state.rpc).not.toHaveBeenCalled();});
