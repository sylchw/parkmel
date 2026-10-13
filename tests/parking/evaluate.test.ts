import { describe, expect, it } from "vitest";
import type { EvaluationContext, ParkingRule } from "../../src/domain/parking/types";
import { evaluateSinglePeriod,evaluateStay } from "../../src/domain/parking/evaluate";
import { MELBOURNE_HOLIDAYS_2026 as calendar } from "../../src/domain/parking/holidays";
function context(minutes = 45, patch: Partial<ParkingRule> = {}): EvaluationContext {
  const arrival = "2026-10-07T00:00:00Z";
  return { timezone: "Australia/Melbourne", vehicleContext: "ordinary_no_permit",
    publicHolidays: [...calendar.dates], evaluatedAt: arrival,
    stay: { arrival, departure: new Date(Date.parse(arrival) + minutes * 60_000).toISOString() },
    schedule: { schemaVersion: 1, sectionId: "synthetic", geometryVersion: 1, completeness: "complete",
      coverage: "full_schedule", verification: "admin_verified", confidenceLevel: 3,
      lastVerifiedAt: arrival, changeState: "none", rules: [{ id: "test", type: "time_limit",
        periods: [{ dayOfWeek: 3, startTime: 0, endTime: 1440 }], maxDurationMinutes: 120,
        feeStatus: "free", permitCondition: "none", holidayPolicy: "applies",
        source: { type: "community", identifier: "synthetic", evidenceKind: "field",
          observedAt: arrival, submittedAt: arrival, sourceDate: null }, ...patch }] } };
}
describe("single supported parking period", () => {
  it.each([[45, "eligible_free"], [120, "eligible_free"], [180, "restricted"]])("evaluates %i minutes", (minutes, expected) => {
    expect(evaluateSinglePeriod(context(Number(minutes)), calendar).eligibility).toBe(expected);
  });
  it.each(["clearway", "no_parking", "no_stopping", "towaway"] as const)("rejects %s", type => {
    expect(evaluateSinglePeriod(context(45, { type }), calendar).reasonCodes).toContain("prohibited");
  });
  it("distinguishes paid, missing price, permit and special categories", () => {
    expect(evaluateSinglePeriod(context(45, { type: "fee", feeStatus: "paid", feeCents: 200 }), calendar).eligibility).toBe("eligible_paid");
    expect(evaluateSinglePeriod(context(45, { type: "fee", feeStatus: "paid" }), calendar).reasonCodes).toContain("unknown_fee");
    expect(evaluateSinglePeriod(context(45, { type: "permit", permitCondition: "required" }), calendar).reasonCodes).toContain("permit_required");
    expect(evaluateSinglePeriod(context(45, { type: "loading" }), calendar).reasonCodes).toContain("special_vehicle_required");
  });
  it("keeps incomplete, unverified, disputed, stale and unsupported schedules unknown", () => {
    for (const change of [{ completeness: "draft" as const }, { changeState: "disputed" as const },
      { verification: "unverified" as const, confidenceLevel: 1 as const, lastVerifiedAt: null }]) {
      const ctx = context(); Object.assign(ctx.schedule, change);
      expect(evaluateSinglePeriod(ctx, calendar).eligibility).toBe("unknown");
    }
    const ctx = context(); ctx.evaluatedAt = "2027-10-07T00:00:00Z";
    expect(evaluateSinglePeriod(ctx, calendar).reasonCodes).toContain("stale");
    expect(evaluateSinglePeriod(context(45, { holidayPolicy: "unknown" }), calendar).reasonCodes).toContain("unknown_holiday");
    expect(evaluateSinglePeriod(context(), null).eligibility).toBe("unknown");
  });
  it("uses half-open periods and distinguishes reviewed hours from missing schedules", () => {
    const patch = { periods: [{ dayOfWeek: 3, startTime: 660, endTime: 705 }] };
    expect(evaluateSinglePeriod(context(45, patch), calendar).eligibility).toBe("eligible_free");
    expect(evaluateSinglePeriod(context(46, patch), calendar).eligibility).toBe("unknown");
    expect(evaluateSinglePeriod(context(45, { periods: [{ dayOfWeek: 4, startTime: 0, endTime: 1440 }] }), calendar).reasonCodes).toContain("outside_signed_hours");
  });
  it("shows no signed limit at 8pm but still applies late restrictions and review safeguards",()=>{
    const ctx=context(180,{periods:[{dayOfWeek:3,startTime:480,endTime:1080}]});
    ctx.stay={arrival:"2026-10-07T09:00:00Z",departure:"2026-10-07T12:00:00Z"};
    expect(evaluateSinglePeriod(ctx,calendar).reasonCodes).toContain("outside_signed_hours");
    ctx.schedule.rules.push({...ctx.schedule.rules[0],id:"late",type:"no_stopping",periods:[{dayOfWeek:3,startTime:1200,endTime:1440}],maxDurationMinutes:undefined});
    expect(evaluateSinglePeriod(ctx,calendar).eligibility).toBe("restricted");
    ctx.schedule.rules.pop();ctx.schedule.completeness="draft";ctx.schedule.coverage="partial";
    expect(evaluateSinglePeriod(ctx,calendar).eligibility).toBe("unknown");
    ctx.schedule.completeness="complete";ctx.schedule.coverage="full_schedule";ctx.schedule.verification="unverified";
    expect(evaluateSinglePeriod(ctx,calendar).eligibility).toBe("unknown");
  });
  it("retains the outside-hours label overnight and notices restrictions starting later",()=>{
    const ctx=context(45,{periods:[3,4].map(dayOfWeek=>({dayOfWeek,startTime:480,endTime:1080}))});
    ctx.stay={arrival:"2026-10-07T09:00:00Z",departure:"2026-10-07T20:00:00Z"};
    expect(evaluateStay(ctx,calendar).reasonCodes).toContain("outside_signed_hours");
    ctx.schedule.rules.push({...ctx.schedule.rules[0],id:"late",type:"no_stopping",maxDurationMinutes:undefined,periods:[{dayOfWeek:3,startTime:1320,endTime:1440}]});
    expect(evaluateStay(ctx,calendar).eligibility).toBe("restricted");
  });
  it("rejects overlaps instead of guessing sign precedence", () => {
    const ctx = context(); ctx.schedule.rules.push({ ...ctx.schedule.rules[0], id: "other" });
    expect(evaluateSinglePeriod(ctx, calendar).reasonCodes).toContain("unsupported_semantics");
  });
});
