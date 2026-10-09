import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateParkingRule, validateParkingSchedule, validateParkingStay } from "../../src/domain/parking/validation.ts";
import type { ParkingRule, ParkingSchedule } from "../../src/domain/parking/types.ts";

const rule: ParkingRule = {
  id: "fixture-rule", type: "time_limit", periods: [{ dayOfWeek: 1, startTime: 0, endTime: 1440 }],
  maxDurationMinutes: 120, feeStatus: "unknown", permitCondition: "none", holidayPolicy: "unknown",
  source: { type: "community", identifier: "synthetic", evidenceKind: "field",
    observedAt: "2026-10-05T10:00:00+11:00", submittedAt: "2026-10-05T11:00:00+11:00", sourceDate: null },
};
const schedule: ParkingSchedule = {
  schemaVersion: 1, sectionId: "fixture-section", geometryVersion: 1,
  completeness: "complete", coverage: "full_schedule", verification: "unverified", confidenceLevel: 1,
  lastVerifiedAt: null, changeState: "none", rules: [rule],
};
describe("untrusted rule input", () => {
  for (const value of [null, undefined, [], 42, "text", {}, { ...rule, source: null }, { ...rule, periods: [null] }]) {
    it(`rejects malformed input ${JSON.stringify(value)}`, () => assert.equal(validateParkingRule(value).valid, false));
  }
  it("accepts explicit unknown price without implying free eligibility", () => assert.equal(validateParkingRule(rule).valid, true));
  it("accepts exclusive midnight end", () => assert.equal(validateParkingRule(rule).valid, true));
  for (const patch of [{ periods: [] }, { periods: [{ dayOfWeek: 1, startTime: 1000, endTime: 500 }] },
    { feeStatus: undefined }, { type: "free", feeStatus: "unknown" }, { feeStatus: "free", feeCents: 50 },
    { maxDurationMinutes: 0 }, { holidayExceptions: [null] },
    { holidayPolicy: "date_exceptions", holidayExceptions: [{ date: "2026-02-30" }] },
    { source: { ...rule.source, observedAt: "2026-10-06T12:00:00+11:00" } },
    { source: { ...rule.source, evidenceKind: "street_view", sourceDate: null } }]) {
    it(`rejects inconsistent rule ${JSON.stringify(patch)}`, () => assert.equal(validateParkingRule({ ...rule, ...patch }).valid, false));
  }
});
describe("versioned schedules", () => {
  it("accepts complete unverified schedule with explicit unknown semantics", () => assert.equal(validateParkingSchedule(schedule).valid, true));
  for (const patch of [{ schemaVersion: 2 }, { geometryVersion: 0 }, { coverage: "partial" },
    { rules: [rule, rule] }, { confidenceLevel: 6 }, { confidenceLevel: 3 }, { verification: "community_verified" },
    { rules: [] }, { completeness: undefined }, { lastVerifiedAt: "2026-10-05T10:00:00Z" }]) {
    it(`rejects inconsistent schedule ${JSON.stringify(patch)}`, () => assert.equal(validateParkingSchedule({ ...schedule, ...patch }).valid, false));
  }
});
describe("explicit-offset stays", () => {
  it("accepts Melbourne-offset timestamps", () => assert.equal(validateParkingStay({ arrival: "2026-10-05T10:00:00+11:00", departure: "2026-10-05T11:00:00+11:00" }).valid, true));
  for (const arrival of ["2026-02-30T10:00:00Z", "2026-10-05", "2026-10-05T10:00:00", "2026-10-05T24:00:00Z", "2026-10-05T10:00:00+15:00"]) {
    it(`rejects ambiguous/impossible instant ${arrival}`, () => assert.equal(validateParkingStay({ arrival, departure: "2026-10-06T12:00:00Z" }).valid, false));
  }
  it("rejects equal instants with different offsets", () => assert.equal(validateParkingStay({ arrival: "2026-10-05T10:00:00+11:00", departure: "2026-10-04T23:00:00Z" }).valid, false));
  it("rejects missing object", () => assert.equal(validateParkingStay(null).valid, false));
});
