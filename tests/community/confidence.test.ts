import { describe, expect, it } from "vitest";
import type { ParkingSchedule } from "../../src/domain/parking/types";
import { calculateConfidence } from "../../src/domain/community/confidence";
const schedule: ParkingSchedule = {
  schemaVersion: 1, sectionId: "fixture-section", geometryVersion: 1,
  completeness: "complete", coverage: "full_schedule", verification: "unverified",
  confidenceLevel: 1, lastVerifiedAt: null, changeState: "none",
  rules: [{ id: "fixture-rule", type: "free", periods: [{ dayOfWeek: 1, startTime: 0, endTime: 1440 }],
    feeStatus: "free", permitCondition: "none", holidayPolicy: "unknown",
    source: { type: "community", identifier: "fixture", evidenceKind: "field",
      observedAt: "2026-01-01T00:00:00Z", submittedAt: "2026-01-01T00:00:00Z", sourceDate: null } }],
};
const position = (id: string, value = schedule) => ({ contributorId: id, eligible: true, active: true, schedule: value });
describe("confidence", () => {
  it.each([[0, 1], [1, 1], [2, 1], [3, 2], [4, 2], [5, 3], [9, 3], [10, 4], [19, 4], [20, 5], [30, 5]])(
    "maps %i distinct contributors to level %i", (count, level) => {
      const result = calculateConfidence(schedule, Array.from({ length: count }, (_, i) => position(String(i))));
      expect(result.agreeingContributors).toBe(count);
      expect(result.confidenceLevel).toBe(level);
      expect(result.verification).toBe(count >= 5 ? "community_verified" : "unverified");
    },
  );
  it("deduplicates identities and excludes inactive/ineligible/mismatched geometry", () => {
    const result = calculateConfidence(schedule, [position("a"), position("a"),
      { ...position("b"), active: false }, { ...position("c"), eligible: false },
      position("d", { ...schedule, geometryVersion: 2 }), position(" ")]);
    expect(result.agreeingContributors).toBe(1);
  });
  it("does not count contradictory active positions or draft schedules", () => {
    const result = calculateConfidence(schedule, [position("a"), position("a", { ...schedule, geometryVersion: 2 }),
      position("b", { ...schedule, completeness: "draft" })]);
    expect(result.agreeingContributors).toBe(0);
  });
  it("admin verification supplies a floor without fabricating votes", () => {
    expect(calculateConfidence(schedule, [], true)).toEqual({ agreeingContributors: 0,
      confidenceLevel: 3, verification: "admin_verified" });
    expect(calculateConfidence(schedule, Array.from({ length: 20 }, (_, i) => position(String(i))), true).confidenceLevel).toBe(5);
  });
  it("confidence remains separate from category, staleness and warnings", () => {
    const stale = { ...schedule, verification: "admin_verified" as const, confidenceLevel: 3 as const, lastVerifiedAt: "2000-01-01T00:00:00Z", changeState: "disputed" as const };
    expect(calculateConfidence(stale, [position("a")]).agreeingContributors).toBe(1);
  });
});
