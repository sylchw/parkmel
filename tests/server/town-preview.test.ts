import {beforeEach,describe,it,expect,vi} from "vitest";
import {NextRequest} from "next/server";
import {clampGuestCentre,townCentre} from "../../src/lib/map/town-centres";
const preview=vi.hoisted(()=>vi.fn());
vi.mock("../../src/lib/server/town-preview",()=>({townPreview:preview}));
import {GET} from "../../src/app/api/map/preview/route";
import {GET as preload} from "../../src/app/api/cron/preload/route";
beforeEach(()=>{preview.mockReset().mockResolvedValue({sections:[],preview:true});vi.unstubAllEnvs();});
describe("public town preview boundary",()=>{
 it("clamps guest centres to a short distance and rejects unknown towns",()=>{const centre=townCentre("carnegie");expect(clampGuestCentre([centre[0]+1,centre[1]-1],centre)).toEqual([centre[0]+.0009,centre[1]-.0007]);expect(()=>townCentre("arbitrary")).toThrow();});
 it("serves only named town snapshots without accepting arbitrary bounds or arrival",async()=>{expect((await GET(new NextRequest("https://parkmel.example/api/map/preview?region=carnegie"))).status).toBe(200);expect(preview).toHaveBeenCalledWith("carnegie");preview.mockClear();expect((await GET(new NextRequest("https://parkmel.example/api/map/preview?west=145&arrival=x"))).status).toBe(400);expect(preview).not.toHaveBeenCalled();});
 it("does not cache failures or expose errors",async()=>{preview.mockRejectedValue(new Error("private"));const response=await GET(new NextRequest("https://parkmel.example/api/map/preview"));expect(response.status).toBe(503);expect(response.headers.get("cache-control")).toBe("no-store");expect(await response.text()).not.toContain("private");});
 it("requires a configured cron secret and warms only the 17 fixed centres",async()=>{expect((await preload(new NextRequest("https://parkmel.example/api/cron/preload"))).status).toBe(503);vi.stubEnv("CRON_SECRET","fixture-secret");expect((await preload(new NextRequest("https://parkmel.example/api/cron/preload"))).status).toBe(401);expect(preview).not.toHaveBeenCalled();const result=await preload(new NextRequest("https://parkmel.example/api/cron/preload",{headers:{authorization:"Bearer fixture-secret"}}));expect(result.status).toBe(200);expect(preview).toHaveBeenCalledTimes(17);});
});
