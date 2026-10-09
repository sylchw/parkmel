import { describe, expect, it } from "vitest";
import type { EvaluationContext, ParkingRule } from "../../src/domain/parking/types";
import { evaluateStay } from "../../src/domain/parking/evaluate";
import { MELBOURNE_HOLIDAYS_2026 as calendar } from "../../src/domain/parking/holidays";
function fixture(departure = "2026-10-07T05:01:00Z", type: ParkingRule["type"] = "clearway"): EvaluationContext {
  const source = { type: "community" as const, identifier: "synthetic", evidenceKind: "field" as const,
    observedAt: "2026-10-01T00:00:00Z", submittedAt: "2026-10-01T00:00:00Z", sourceDate: null };
  return { timezone: "Australia/Melbourne", vehicleContext: "ordinary_no_permit",
    evaluatedAt: "2026-10-07T00:00:00Z", publicHolidays: [...calendar.dates],
    stay: { arrival: "2026-10-07T04:00:00Z", departure },
    schedule: { schemaVersion: 1, sectionId: "synthetic", geometryVersion: 1, completeness: "complete",
      coverage: "full_schedule", verification: "admin_verified", confidenceLevel: 3,
      lastVerifiedAt: "2026-10-01T00:00:00Z", changeState: "none", rules: [
        { id: "free", type: "free", feeStatus: "free", permitCondition: "none", holidayPolicy: "applies", source,
          periods: [{ dayOfWeek: 3, startTime: 0, endTime: 960 }] },
        { id: "later", type, feeStatus: type === "fee" ? "paid" : "free", feeCents: type === "fee" ? 200 : 0,
          permitCondition: "none", holidayPolicy: "applies", source,
          periods: [{ dayOfWeek: 3, startTime: 960, endTime: 1440 }] }] } };
}
describe("whole stay transitions", () => {
  it.each(["clearway", "fee"] as const)("excludes a %s starting exactly at departure", type => {
    expect(evaluateStay(fixture("2026-10-07T05:00:00Z", type), calendar).eligibility).toBe("eligible_free");
  });
  it("rejects clearway before departure and records the first transition", () => {
    const result = evaluateStay(fixture(), calendar);
    expect(result.eligibility).toBe("restricted");
    expect(result.earliestTransition).toBe("2026-10-07T05:00:00.000Z");
    expect(result.appliedRuleIds).toEqual(["free", "later"]);
  });
  it("paid intervals make the whole stay paid", () => {
    expect(evaluateStay(fixture(undefined, "fee"), calendar).eligibility).toBe("eligible_paid");
  });
  it("partitions midnight and excludes reviewed public-holiday restrictions", () => {
    const ctx = fixture(); ctx.stay = { arrival: "2026-03-08T12:30:00Z", departure: "2026-03-08T13:30:00Z" };
    ctx.evaluatedAt = "2026-03-08T00:00:00Z";
    ctx.schedule.lastVerifiedAt = "2026-03-01T00:00:00Z";
    ctx.schedule.rules = [{ ...ctx.schedule.rules[0], holidayPolicy: "excluded",
      source: { ...ctx.schedule.rules[0].source, observedAt: "2026-03-01T00:00:00Z", submittedAt: "2026-03-01T00:00:00Z" },
      periods: [0, 1].map(dayOfWeek => ({ dayOfWeek, startTime: 0, endTime: 1440 })) }];
    expect(evaluateStay(ctx, calendar).eligibility).toBe("eligible_free");
    ctx.schedule.rules[0].holidayPolicy = "applies";
    expect(evaluateStay(ctx, calendar).eligibility).toBe("eligible_free");
  });
  it("never resets a time limit at a signed transition", () => {
    const ctx = fixture(undefined, "free"); ctx.schedule.rules[0].type = "time_limit";
    ctx.schedule.rules[0].maxDurationMinutes = 120;
    expect(evaluateStay(ctx, calendar).reasonCodes).toContain("unsupported_semantics");
  });
  it("keeps fractional seconds without inventing a DST transition", () => {
    const ctx = fixture("2026-10-07T05:01:00.123Z");
    ctx.stay.arrival = "2026-10-07T04:00:00.456Z";
    expect(evaluateStay(ctx, calendar).eligibility).toBe("restricted");
  });
  it("retains unknown for unreviewed DST carryover", () => {
    const ctx = fixture(); ctx.stay = { arrival: "2026-10-03T15:30:00Z", departure: "2026-10-03T16:30:00Z" };
    expect(evaluateStay(ctx, calendar).eligibility).toBe("unknown");
  });
});
