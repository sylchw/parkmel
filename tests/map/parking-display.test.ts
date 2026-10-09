import {describe,expect,it} from "vitest";
import {parkingDisplay,parkingDisplayLabel} from "../../src/lib/map/parking-display";
import type {EvaluationResult,ParkingRule,ParkingSchedule} from "../../src/domain/parking/types";
const rule:ParkingRule={id:"active",type:"time_limit",periods:[{dayOfWeek:4,startTime:0,endTime:1440}],feeStatus:"free",maxDurationMinutes:120,permitCondition:"none",holidayPolicy:"applies",source:{type:"community",identifier:"private",evidenceKind:"field",observedAt:"2026-10-08T00:00:00Z",submittedAt:"2026-10-08T00:00:00Z",sourceDate:null}};
const schedule:ParkingSchedule={schemaVersion:1,sectionId:"fixture",geometryVersion:1,completeness:"complete",coverage:"full_schedule",verification:"admin_verified",confidenceLevel:3,lastVerifiedAt:"2026-10-08T00:00:00Z",changeState:"none",rules:[rule]};
const result:EvaluationResult={eligibility:"eligible_free",reasonCodes:["allowed"],appliedRuleIds:["active"],explanation:"Allowed",earliestTransition:null};
const display=(patch:Partial<ParkingRule>,evaluation:EvaluationResult=result)=>parkingDisplay({...schedule,rules:[{...rule,...patch}]},evaluation);
describe("signed parking map categories",()=>{
 it.each([[5,"short"],[15,"short"],[30,"short"],[59,"short"],[60,"one_hour"],[90,"one_hour"],[119,"one_hour"],[120,"medium"],[180,"medium"],[239,"medium"],[240,"long"],[480,"long"]])("assigns %i minutes without overlapping 4P bands",(minutes,category)=>expect(display({maxDurationMinutes:minutes as number}).category).toBe(category));
 it("retains the 2P limit alongside a paid requirement, even when the tariff is unknown",()=>{
  const value=display({feeStatus:"paid"},{...result,eligibility:"unknown",reasonCodes:["unknown_fee"]});
  expect(value).toMatchObject({category:"medium",payment:"paid",maxDurationMinutes:120});
  expect(parkingDisplayLabel(value)).toContain("2P");expect(parkingDisplayLabel(value)).toContain("Metered / paid");
 });
 it("distinguishes untimed paid parking from an unknown limit",()=>expect(display({type:"fee",maxDurationMinutes:undefined,feeStatus:"paid"}).category).toBe("untimed"));
 it("uses only applied rules, ignoring inactive permit and longer limit panels",()=>{
  expect(parkingDisplay({...schedule,rules:[rule,{...rule,id:"inactive",type:"permit",permitCondition:"required",maxDurationMinutes:480}]},result).category).toBe("medium");
 });
 it("preserves a time-limit colour when a stay is too long and adds a restriction marker",()=>expect(display({}, {...result,eligibility:"restricted",reasonCodes:["duration_exceeded"]})).toMatchObject({category:"medium",stayExceeded:true}));
 it.each(["stale","unverified","change_reported","unknown_holiday","unsupported_semantics"] as const)("does not colour an uncertain %s schedule as permitted",reason=>expect(display({}, {...result,eligibility:"unknown",reasonCodes:[reason]}).category).toBe("unknown"));
 it.each(["no_parking","no_stopping","clearway"] as const)("keeps %s distinct from short-stay parking",type=>expect(display({type}).category).toBe("prohibited"));
 it("prioritises permit-only and special eligibility over duration",()=>{
  expect(display({type:"permit",permitCondition:"required"}).category).toBe("permit");
  expect(display({type:"loading"}).category).toBe("special");
  expect(display({type:"accessible"}).category).toBe("special");
 });
 it("names the actual prohibited or special-use clause in popup/list labels",()=>{
  expect(parkingDisplayLabel(display({type:"clearway",maxDurationMinutes:undefined}))).toContain("Clearway");
  expect(parkingDisplayLabel(display({type:"loading",maxDurationMinutes:30}))).toContain("Loading zone · 30 minutes maximum");
  expect(parkingDisplayLabel(display({type:"accessible"}))).toContain("Accessible parking only");
 });
 it("never infers no time limit from absent active rule evidence",()=>expect(parkingDisplay(schedule,{...result,appliedRuleIds:[]}).category).toBe("unknown"));
});

it("shows reviewed outside-hours stays as no signed time limit",()=>{const value=parkingDisplay(schedule,{...result,appliedRuleIds:[],reasonCodes:["outside_signed_hours"]});expect(value.category).toBe("untimed");expect(parkingDisplayLabel(value)).toContain("No signed time limit");expect(parkingDisplay(schedule,{...result,eligibility:"unknown",appliedRuleIds:[],reasonCodes:["unverified"]}).category).toBe("unknown");});
