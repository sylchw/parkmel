import { describe, expect, it } from "vitest";
import {
  disambiguateMelbourneFold, instantToMelbourneLocal,
  isAmbiguousMelbourneLocal, melbourneLocalToInstant,
} from "../../src/domain/parking/time";

// Synthetic inputs exercising timezone transitions; no observed parking/holiday data.
describe("Melbourne local time conversion", () => {
  it.each([
    ["2026-01-15T00:00:00", "2026-01-14T13:00:00.000Z"],
    ["2026-07-15T00:00:00", "2026-07-14T14:00:00.000Z"],
    ["2024-02-29T23:59:59", "2024-02-29T12:59:59.000Z"],
    ["2026-10-04T01:59:59", "2026-10-03T15:59:59.000Z"],
    ["2026-10-04T03:00:00", "2026-10-03T16:00:00.000Z"],
    ["2026-04-05T01:59:59", "2026-04-04T14:59:59.000Z"],
    ["2026-04-05T03:00:00", "2026-04-04T17:00:00.000Z"],
  ])("converts and round trips %s", (local, expected) => {
    const instant = melbourneLocalToInstant(local);
    expect(instant?.toISOString()).toBe(expected);
    expect(instantToMelbourneLocal(instant!)).toBe(local);
    expect(isAmbiguousMelbourneLocal(local)).toBe(false);
  });

  it.each(["2026-10-04T02:00:00", "2026-10-04T02:30:00", "2026-10-04T02:59:59"])(
    "rejects spring gap %s for every choice", (local) => {
      for (const choice of [undefined, "earlier", "later"] as const) {
        expect(melbourneLocalToInstant(local, choice)).toBeNull();
      }
      expect(isAmbiguousMelbourneLocal(local)).toBe(false);
    },
  );

  it.each([
    ["2026-04-05T02:00:00", "2026-04-04T15:00:00.000Z", "2026-04-04T16:00:00.000Z"],
    ["2026-04-05T02:30:00", "2026-04-04T15:30:00.000Z", "2026-04-04T16:30:00.000Z"],
    ["2026-04-05T02:59:59", "2026-04-04T15:59:59.000Z", "2026-04-04T16:59:59.000Z"],
    // Historical transition was in March: catches a hard-coded April detector.
    ["2007-03-25T02:30:00", "2007-03-24T15:30:00.000Z", "2007-03-24T16:30:00.000Z"],
  ])("requires explicit occurrence for %s", (local, earlier, later) => {
    expect(isAmbiguousMelbourneLocal(local)).toBe(true);
    expect(melbourneLocalToInstant(local)).toBeNull();
    expect(melbourneLocalToInstant(local, "earlier")?.toISOString()).toBe(earlier);
    expect(melbourneLocalToInstant(local, "later")?.toISOString()).toBe(later);
    expect(disambiguateMelbourneFold(local, false)?.toISOString()).toBe(earlier);
    expect(disambiguateMelbourneFold(local, true)?.toISOString()).toBe(later);
    expect(instantToMelbourneLocal(new Date(earlier))).toBe(local);
    expect(instantToMelbourneLocal(new Date(later))).toBe(local);
  });

  it.each([
    "", "2026-02-30T00:00:00", "2026-02-29T00:00:00", "2026-13-01T00:00:00",
    "2026-01-00T00:00:00", "2026-01-01T24:00:00", "2026-01-01T00:60:00",
    "2026-01-01T00:00:60", "2026-01-01T00:00", "2026-01-01T00:00:00Z",
  ])("rejects malformed or impossible date %s without throwing", (local) => {
    expect(melbourneLocalToInstant(local)).toBeNull();
    expect(isAmbiguousMelbourneLocal(local)).toBe(false);
  });
});
