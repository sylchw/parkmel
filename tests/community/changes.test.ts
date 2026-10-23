import { describe, expect, it } from "vitest";
import type { ParkingSchedule } from "../../src/domain/parking/types";
import { CHANGE_WINDOW_MS, evaluateChangeWindow } from "../../src/domain/community/changes";
const now = Date.parse("2026-10-07T00:00:00Z");
const current: ParkingSchedule = { schemaVersion: 1, sectionId: "synthetic", geometryVersion: 1,
  completeness: "complete", coverage: "full_schedule", verification: "unverified", confidenceLevel: 1,
  lastVerifiedAt: null, changeState: "none", rules: [{ id: "rule", type: "free", feeStatus: "free",
    permitCondition: "none", holidayPolicy: "applies", periods: [{ dayOfWeek: 1, startTime: 0, endTime: 1440 }],
    source: { type: "community", identifier: "synthetic", evidenceKind: "field", observedAt: "2026-10-01T00:00:00Z",
      submittedAt: "2026-10-01T00:00:00Z", sourceDate: null } }] };
const candidate: ParkingSchedule = { ...current, rules: [{ ...current.rules[0], type: "no_parking" }] };
const other: ParkingSchedule = { ...current, rules: [{ ...current.rules[0], type: "clearway" }] };
const reports = (count: number, schedule = candidate, prefix = "u") => Array.from({ length: count }, (_, i) => ({
  contributorId: `${prefix}${i}`, schedule, eligible: true, active: true, reportedAt: now }));
describe("change report window", () => {
  it.each([[1, "none"], [2, "none"], [3, "change_reported"], [4, "change_reported"], [5, "change_reported"]] as const)(
    "handles %i matching reports", (count, state) => {
      const result = evaluateChangeWindow(current, reports(count), now);
      expect(result.state).toBe(state);
      expect(result.promotionCandidate !== null).toBe(count >= 5);
      expect(result.requiresEvidenceReview).toBe(count >= 5);
    },
  );
  it("includes exactly 168 hours and excludes one millisecond older or future reports", () => {
    const values = reports(5); values[0].reportedAt = now - CHANGE_WINDOW_MS;
    values[1].reportedAt = now - CHANGE_WINDOW_MS - 1; values[2].reportedAt = now + 1;
    expect(evaluateChangeWindow(current, values, now).counts[0].contributors).toBe(3);
  });
  it("latches warnings and disputes after all reports expire", () => {
    expect(evaluateChangeWindow(current, [], now, "change_reported").state).toBe("change_reported");
    expect(evaluateChangeWindow(current, reports(5), now, "disputed").promotionCandidate).toBeNull();
  });
  it("two incompatible threshold alternatives are disputed regardless of order", () => {
    const values = [...reports(5), ...reports(3, other, "v")];
    for (const list of [values, [...values].reverse()]) {
      const result = evaluateChangeWindow(current, list, now);
      expect(result.state).toBe("disputed"); expect(result.promotionCandidate).toBeNull();
    }
  });
  it("excludes duplicate/conflicting identities, inactive, ineligible and wrong geometry", () => {
    const values = [...reports(1), ...reports(1), ...reports(1, other),
      { ...reports(1, candidate, "inactive")[0], active: false },
      { ...reports(1, candidate, "bad")[0], eligible: false },
      ...reports(1, { ...candidate, geometryVersion: 2 }, "wrong")];
    const result = evaluateChangeWindow(current, values, now);
    expect(result.counts.every(c => c.contributors === 0)).toBe(true);
  });
  it("ignores incomplete schedules and current-schedule matches", () => {
    expect(evaluateChangeWindow(current, [...reports(5, current), ...reports(5, { ...candidate, completeness: "draft" })], now).counts).toEqual([]);
  });
});
