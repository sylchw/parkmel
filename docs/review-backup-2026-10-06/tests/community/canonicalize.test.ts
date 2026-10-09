import { describe, expect, it } from "vitest";
import { canonicalizeSchedule, schedulesAgree, CANONICAL_SCHEMA_VERSION } from "../../src/domain/community/canonicalize";
import { ParkingRule } from "../../src/domain/parking/types";

function makeRule(overrides: Partial<ParkingRule> = {}): ParkingRule {
  return {
    id: "rule-1",
    type: "time_limit",
    periods: [
      { dayOfWeek: 1, startTime: 540, endTime: 1080 },
      { dayOfWeek: 2, startTime: 540, endTime: 1080 },
    ],
    maxDurationMinutes: 60,
    source: {
      type: "official",
      identifier: "council-a",
      capturedAt: "2026-01-01T00:00:00Z",
    },
    lastVerifiedAt: "2026-01-01T00:00:00Z",
    confidence: "verified",
    ...overrides,
  };
}

describe("canonicalizeSchedule", () => {
  it("includes schema version in identity", () => {
    const result = canonicalizeSchedule(makeRule());
    expect(result.schemaVersion).toBe(CANONICAL_SCHEMA_VERSION);
    expect(result.hash).toMatch(/^[0-9a-f]{8}$/);
  });

  it("agrees when only ordering changes", () => {
    const a = makeRule();
    const b = makeRule({
      periods: [
        { dayOfWeek: 2, startTime: 540, endTime: 1080 },
        { dayOfWeek: 1, startTime: 540, endTime: 1080 },
      ],
    });
    expect(schedulesAgree(a, b)).toBe(true);
  });

  it("does not agree when periods differ", () => {
    const a = makeRule();
    const b = makeRule({
      periods: [
        { dayOfWeek: 1, startTime: 540, endTime: 1080 },
        { dayOfWeek: 3, startTime: 540, endTime: 1080 },
      ],
    });
    expect(schedulesAgree(a, b)).toBe(false);
  });

  it("does not agree when conditions differ", () => {
    const a = makeRule();
    const b = makeRule({ maxDurationMinutes: 90 });
    expect(schedulesAgree(a, b)).toBe(false);
  });

  it("normalizes optional fields deterministically", () => {
    const a = makeRule({
      holidayExceptions: [
        { date: "2026-01-01", name: "New Year" },
        { date: "2026-12-25" },
      ],
    });
    const b = makeRule({
      holidayExceptions: [
        { date: "2026-12-25" },
        { date: "2026-01-01", name: "New Year" },
      ],
    });
    expect(schedulesAgree(a, b)).toBe(true);
  });
});