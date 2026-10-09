import { describe, it, expect } from "vitest";
import { validateParkingRule, validateParkingStay } from "../../src/domain/parking/validation";
import { ParkingRule, ParkingStay } from "../../src/domain/parking/types";

describe("validateParkingRule", () => {
  const validRule: ParkingRule = {
    id: "rule-1",
    type: "time_limit",
    periods: [{ dayOfWeek: 1, startTime: 540, endTime: 1080 }],
    maxDurationMinutes: 60,
    source: {
      type: "official",
      identifier: "council-a",
      capturedAt: "2024-01-01T00:00:00Z",
    },
    lastVerifiedAt: "2024-01-01T00:00:00Z",
    confidence: "verified",
  };

  it("accepts a valid time_limit rule", () => {
    const result = validateParkingRule(validRule);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects a time_limit rule missing maxDurationMinutes", () => {
    const rule = { ...validRule, maxDurationMinutes: undefined };
    const result = validateParkingRule(rule);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("maxDurationMinutes is required for time_limit rules");
  });

  it("rejects a fee rule missing feeCents", () => {
    const rule: ParkingRule = {
      ...validRule,
      type: "fee",
      maxDurationMinutes: undefined,
    };
    const result = validateParkingRule(rule);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("feeCents is required for fee rules");
  });

  it("rejects invalid time periods", () => {
    const rule = {
      ...validRule,
      periods: [{ dayOfWeek: 8, startTime: 540, endTime: 1080 }],
    };
    const result = validateParkingRule(rule);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes("Period at index 0 is invalid"))).toBe(true);
  });

  it("rejects endTime <= startTime", () => {
    const rule = {
      ...validRule,
      periods: [{ dayOfWeek: 1, startTime: 1080, endTime: 540 }],
    };
    const result = validateParkingRule(rule);
    expect(result.valid).toBe(false);
  });

  it("rejects invalid holiday exception date", () => {
    const rule = {
      ...validRule,
      holidayExceptions: [{ date: "2024-13-01" }],
    };
    const result = validateParkingRule(rule);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes("Holiday exception at index 0 is invalid"))).toBe(true);
  });

  it("rejects invalid source", () => {
    const rule = {
      ...validRule,
      source: { type: "unknown" as any, identifier: "test", capturedAt: "2024-01-01T00:00:00Z" },
    };
    const result = validateParkingRule(rule);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Rule source is invalid");
  });
});

describe("validateParkingStay", () => {
  const validStay: ParkingStay = {
    arrival: "2024-01-01T10:00:00Z",
    departure: "2024-01-01T12:00:00Z",
  };

  it("accepts a valid stay", () => {
    const result = validateParkingStay(validStay);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects departure before arrival", () => {
    const stay: ParkingStay = {
      arrival: "2024-01-01T12:00:00Z",
      departure: "2024-01-01T10:00:00Z",
    };
    const result = validateParkingStay(stay);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Departure must be after arrival");
  });

  it("rejects invalid arrival timestamp", () => {
    const stay: ParkingStay = {
      arrival: "not-a-date",
      departure: "2024-01-01T12:00:00Z",
    };
    const result = validateParkingStay(stay);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Arrival must be a valid ISO 8601 timestamp");
  });

  it("rejects invalid departure timestamp", () => {
    const stay: ParkingStay = {
      arrival: "2024-01-01T10:00:00Z",
      departure: "not-a-date",
    };
    const result = validateParkingStay(stay);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Departure must be a valid ISO 8601 timestamp");
  });
});