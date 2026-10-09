import { describe, expect, it } from "vitest";
import { canonicalizeSchedule, schedulesAgree } from "../../src/domain/community/canonicalize";
import type { ParkingRule, ParkingSchedule } from "../../src/domain/parking/types";

const rule: ParkingRule = {
  id: "synthetic-1", type: "time_limit", feeStatus: "free", maxDurationMinutes: 120,
  permitCondition: "none", holidayPolicy: "unknown",
  periods: [{ dayOfWeek: 1, startTime: 0, endTime: 1440 }, { dayOfWeek: 2, startTime: 540, endTime: 1080 }],
  source: { type: "community", identifier: "observer-a", evidenceKind: "field",
    observedAt: "2026-10-05T10:00:00+11:00", submittedAt: "2026-10-05T11:00:00+11:00", sourceDate: null },
};
const fixture = (): ParkingSchedule => ({ schemaVersion: 1, sectionId: "section-1", geometryVersion: 1,
  completeness: "complete", coverage: "full_schedule", verification: "unverified", confidenceLevel: 1,
  lastVerifiedAt: null, changeState: "none", rules: [structuredClone(rule)] });

describe("complete schedule agreement", () => {
  it("hashes the complete schema/geometry payload with SHA-256", async () => {
    const value = await canonicalizeSchedule(fixture());
    expect(value.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.parse(value.canonical).geometryVersion).toBe(1);
  });
  it("ignores observer metadata, display IDs and verification strength", () => {
    const a = fixture(), b = fixture();
    b.rules[0].id = "independent-display-id";
    b.rules[0].source.identifier = "observer-b";
    b.rules[0].source.submittedAt = "2026-10-06T12:00:00Z";
    b.verification = "admin_verified"; b.confidenceLevel = 3; b.lastVerifiedAt = "2026-10-06T13:00:00Z";
    expect(schedulesAgree(a, b)).toBe(true);
  });
  it("normalizes ordering and repeated equivalent periods", () => {
    const a = fixture(), b = fixture(); b.rules[0].periods.reverse(); b.rules[0].periods.push(b.rules[0].periods[0]);
    expect(schedulesAgree(a, b)).toBe(true);
  });
  it("normalizes clause ordering", () => {
    const a = fixture(); a.rules.push({ ...structuredClone(rule), id: "second", type: "no_stopping" });
    const b = structuredClone(a); b.rules.reverse(); expect(schedulesAgree(a, b)).toBe(true);
  });
  for (const patch of [{ feeStatus: "unknown" }, { permitCondition: "unknown" },
    { holidayPolicy: "applies" }, { maxDurationMinutes: 60 }, { type: "no_stopping" }]) {
    it(`keeps different semantics distinct: ${JSON.stringify(patch)}`, () => {
      const a = fixture(), b = fixture(); b.rules[0] = { ...b.rules[0], ...patch } as ParkingRule;
      expect(schedulesAgree(a, b)).toBe(false);
    });
  }
  it("keeps changed periods distinct", () => {
    const a = fixture(), b = fixture(); b.rules[0].periods[0].endTime = 600; expect(schedulesAgree(a, b)).toBe(false);
  });
  it("keeps section and geometry identity distinct", () => {
    const a = fixture(), b = fixture(); b.geometryVersion = 2; expect(schedulesAgree(a, b)).toBe(false);
    b.geometryVersion = 1; b.sectionId = "other"; expect(schedulesAgree(a, b)).toBe(false);
  });
  it("keeps date exceptions but ignores holiday display names", () => {
    const a = fixture(); a.rules[0].holidayPolicy = "date_exceptions"; a.rules[0].holidayExceptions = [{ date: "2026-11-03", name: "display" }];
    const b = structuredClone(a); b.rules[0].holidayExceptions![0].name = "other display";
    expect(schedulesAgree(a, b)).toBe(true);
    b.rules[0].holidayExceptions![0].date = "2026-12-25"; expect(schedulesAgree(a, b)).toBe(false);
  });
  it("rejects partial, invalid and unsupported-schema schedules", () => {
    expect(() => schedulesAgree(fixture(), { ...fixture(), completeness: "draft", coverage: "partial" })).toThrow();
    expect(() => schedulesAgree(fixture(), { ...fixture(), geometryVersion: 0 })).toThrow();
    expect(() => schedulesAgree(fixture(), { ...fixture(), schemaVersion: 2 } as unknown as ParkingSchedule)).toThrow();
  });
});
