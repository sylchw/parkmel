import {beforeEach,it,expect,vi} from "vitest";
import {NextRequest} from "next/server";
import index from "../../public/carnegie-sections.json";
const mock=vi.hoisted(()=>({session:vi.fn(),rpc:vi.fn(),from:vi.fn()}));
vi.mock("../../src/lib/server/auth",()=>({createRequestAuth:()=>({rpc:mock.rpc,from:mock.from}),eligibilityAdapter:()=>({})}));
vi.mock("../../src/lib/server/eligibility",async original=>({...await original<typeof import("../../src/lib/server/eligibility")>(),serverEligibility:mock.session}));
import {POST as submit} from "../../src/app/api/annotations/route";
import {POST as review,GET as queue} from "../../src/app/api/admin/reviews/route";
const side=index.features[0];
function payload(){const now=new Date().toISOString();return {schemaVersion:1,sectionId:side.id,geometryVersion:1,side:side.properties.side,startDescription:side.properties.startDescription,endDescription:side.properties.endDescription,allPanelsAndBoundariesChecked:true,panels:[{id:"panel",text:"2P",arrow:"both",ruleIds:["rule"]}],schedule:{schemaVersion:1,sectionId:side.id,geometryVersion:1,completeness:"complete",coverage:"full_schedule",verification:"unverified",confidenceLevel:1,lastVerifiedAt:null,changeState:"none",rules:[{id:"rule",type:"time_limit",maxDurationMinutes:120,periods:[{dayOfWeek:4,startTime:0,endTime:1440}],feeStatus:"free",permitCondition:"none",holidayPolicy:"applies",source:{type:"community",identifier:"test",evidenceKind:"street_view",observedAt:now,submittedAt:now,sourceDate:now.slice(0,10)}}]}};}
const req=(body:unknown,origin="https://parkmel.test")=>new NextRequest("https://parkmel.test/api/annotations",{method:"POST",headers:{origin,"content-type":"application/json"},body:JSON.stringify(body)});
beforeEach(()=>{vi.clearAllMocks();mock.session.mockResolvedValue({kind:"eligible",userId:"user"});mock.rpc.mockResolvedValue({data:"submission",error:null});});
it("submits a complete Street View transcription for server review with registered side identity",async()=>{expect((await submit(req(payload()))).status).toBe(200);expect(mock.rpc.mock.calls[0][0]).toBe("submit_pilot_annotation");});
it.each(["guest","unverified","suspended"])("denies %s submission",async kind=>{mock.session.mockResolvedValue({kind,userId:null});expect((await submit(req(payload()))).status).toBe(403);expect(mock.rpc).not.toHaveBeenCalled();});
it("rejects forged geometry, verification and cross-origin submission",async()=>{const value=payload();value.side="unknown";expect((await submit(req(value))).status).toBe(400);const forged=payload();forged.schedule.verification="admin_verified";expect((await submit(req(forged))).status).toBe(400);expect((await submit(req(payload(),"https://evil.test"))).status).toBe(403);expect(mock.rpc).not.toHaveBeenCalled();});
it("only allows server-verified admin review with optional notes",async()=>{expect((await review(req({id:side.id,decision:"approve",reason:"Checked signs"}))).status).toBe(403);mock.session.mockResolvedValue({kind:"admin",userId:"admin"});expect((await review(req({id:side.id,decision:"approve",reason:""}))).status).toBe(200);expect((await review(req({id:side.id,decision:"approve",reason:"Checked signs"}))).status).toBe(200);expect(mock.rpc.mock.calls[0][0]).toBe("review_pilot_annotation_current");});
it("does not leak database failures",async()=>{mock.rpc.mockResolvedValue({data:null,error:{message:"database secret"}});const response=await submit(req(payload()));expect(response.status).toBe(503);expect(await response.text()).not.toContain("database secret");});

it.each([undefined,"x","   "])("accepts optional admin note %s",async reason=>{mock.session.mockResolvedValue({kind:"admin"});expect((await review(req({id:side.id,decision:"reject",reason}))).status).toBe(200);expect(mock.rpc).toHaveBeenCalledWith("review_pilot_annotation_current",{submission:side.id,decision:"reject",reason:reason?.trim()??"",expected_revision:null});});
it.each([null,42,"x".repeat(2001)])("rejects invalid notes",async reason=>{mock.session.mockResolvedValue({kind:"admin"});expect((await review(req({id:side.id,decision:"approve",reason}))).status).toBe(400);expect(mock.rpc).not.toHaveBeenCalled();});

it("passes the displayed publication revision and safely reports concurrent changes",async()=>{mock.session.mockResolvedValue({kind:"admin"});mock.rpc.mockResolvedValue({error:{code:"40001",message:"private database error"}});const response=await review(req({id:side.id,decision:"approve",expectedRevision:side.id}));expect(response.status).toBe(409);expect(mock.rpc).toHaveBeenCalledWith("review_pilot_annotation_current",{submission:side.id,decision:"approve",reason:"",expected_revision:side.id});expect(await response.text()).not.toContain("private database error");});
it.each([42,"bad-revision"])("rejects invalid displayed revision %s",async expectedRevision=>{mock.session.mockResolvedValue({kind:"admin"});expect((await review(req({id:side.id,decision:"approve",expectedRevision}))).status).toBe(400);expect(mock.rpc).not.toHaveBeenCalled();});

it("includes the exact published revision in the admin comparison and denies other users",async()=>{
 const pending={id:side.id,section_id:side.id,base_revision:null,payload:payload()};
 const publication={section_id:side.id,submission_id:side.id,verification:"admin_verified",current:{payload:payload()}};
 const chain={eq:vi.fn().mockReturnThis(),order:vi.fn().mockReturnThis(),limit:vi.fn().mockResolvedValue({data:[pending],error:null})};
 const published={in:vi.fn().mockResolvedValue({data:[publication],error:null})};
 mock.from.mockImplementation(table=>({select:()=>table==="pilot_submission"?chain:published}));
 const request=new NextRequest("https://parkmel.test/api/admin/reviews");
 expect((await queue(request)).status).toBe(403);expect(mock.from).not.toHaveBeenCalled();
 mock.session.mockResolvedValue({kind:"admin"});const response=await queue(request);expect(response.status).toBe(200);expect((await response.json()).submissions[0].currentPublication).toEqual(publication);expect(published.in).toHaveBeenCalledWith("section_id",[side.id]);
 published.in.mockResolvedValue({data:null,error:{message:"private error"}});expect((await queue(request)).status).toBe(503);
});

it.each(["admin","reviewer"])("%s can directly publish a validated contribution",async kind=>{mock.session.mockResolvedValue({kind});const response=await submit(req({...payload(),directApprove:true}));expect(response.status).toBe(200);expect((await response.json()).approved).toBe(true);expect(mock.rpc).toHaveBeenCalledWith("submit_and_approve_parking",{p:expect.any(Object)});});
it("ordinary contributors cannot request direct approval",async()=>{expect((await submit(req({...payload(),directApprove:true}))).status).toBe(403);expect(mock.rpc).not.toHaveBeenCalled();});
it("reviewers can review current parking submissions",async()=>{mock.session.mockResolvedValue({kind:"reviewer"});expect((await review(req({id:side.id,decision:"approve"}))).status).toBe(200);});
