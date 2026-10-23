import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import StaySelector, { selectedStay, shortcutDate } from "../../src/components/search/StaySelector";
import { MELBOURNE_HOLIDAYS_2026 as calendar } from "../../src/domain/parking/holidays";
const now = Date.parse("2026-10-07T00:00:00Z");
describe("stay selector", () => {
  it("converts minutes input to a concrete positive stay", () => {
    expect(selectedStay("2026-10-07T11:00", 45)).toEqual({ arrival: "2026-10-07T00:00:00.000Z", departure: "2026-10-07T00:45:00.000Z" });
  });
  it.each([0, -1, NaN, 0.5, 31 * 1440 + 1])("rejects duration %s", duration => {
    expect(selectedStay("2026-10-07T11:00", duration)).toBeNull();
  });
  it("rejects gaps and requires an explicit fold occurrence", () => {
    expect(selectedStay("2026-10-04T02:30", 45)).toBeNull();
    expect(selectedStay("2026-04-05T02:30", 45)).toBeNull();
    expect(selectedStay("2026-04-05T02:30", 45, "earlier")?.arrival).toBe("2026-04-04T15:30:00.000Z");
    expect(selectedStay("2026-04-05T02:30", 45, "later")?.arrival).toBe("2026-04-04T16:30:00.000Z");
  });
  it.each([["weekday", "2026-10-07"], ["saturday", "2026-10-10"], ["sunday", "2026-10-11"],
    ["holiday", "2026-11-03"]] as const)("selects a concrete %s shortcut", (kind, expected) => {
    expect(shortcutDate(kind, now, calendar)).toBe(expected);
  });
  it("weekday moves to Monday from a weekend; missing future holidays stay unavailable", () => {
    expect(shortcutDate("weekday", Date.parse("2026-10-09T14:00:00Z"), calendar)).toBe("2026-10-12");
    expect(shortcutDate("holiday", now, null)).toBeNull();
    expect(shortcutDate("holiday", Date.parse("2027-01-01T00:00:00Z"), calendar)).toBeNull();
  });
  it("renders labelled controls, initial retained values, holiday display and mobile width constraints", () => {
    const html = renderToStaticMarkup(createElement(StaySelector, { initialArrival: "2026-04-05T02:30:00",
      initialDurationMinutes: 45, now, calendar, onSelect: () => {} }));
    expect(html).toContain('value="2026-04-05T02:30:00"');
    expect(html).toContain('value="45"');
    expect(html).toContain("Earlier occurrence"); expect(html).toContain("Public holiday");
    expect(html).toContain("min-width:0"); expect(html).toContain("flex-wrap:wrap");
    expect(html).toContain('aria-label="Parking stay"');
  });
});
