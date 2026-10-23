import { describe, expect, it } from "vitest";
import { interpretHolidayPolicy, isMelbournePublicHoliday, ruleAppliesOnDate,
  MELBOURNE_HOLIDAYS_2026 as calendar } from "../../src/domain/parking/holidays";
describe("reviewed metropolitan Melbourne holiday semantics", () => {
  it.each(calendar.dates)("recognises sourced 2026 holiday %s", date => {
    expect(isMelbournePublicHoliday(date, calendar)).toBe(true);
  });
  it("does not fabricate a substitute ANZAC day or equate Sundays with holidays", () => {
    expect(isMelbournePublicHoliday("2026-04-27", calendar)).toBe(false);
    expect(isMelbournePublicHoliday("2026-10-11", calendar)).toBe(false);
    expect(isMelbournePublicHoliday("2026-12-28", calendar)).toBe(true);
  });
  it.each([
    ["named", "none", "excluded"], ["none", "none", "applies"],
    ["named", "includes", "applies"], ["none", "excludes", "excluded"],
    ["unknown", "none", "unknown"], ["named", "unsupported", "unknown"],
  ] as const)("interprets %s days with %s override", (days, override, expected) => {
    expect(interpretHolidayPolicy(days, override)).toBe(expected);
  });
  it("excludes named weekdays on Labour Day while no-day signs retain effect", () => {
    expect(ruleAppliesOnDate({ holidayPolicy: "excluded" }, "2026-03-09", calendar)).toBe(false);
    expect(ruleAppliesOnDate({ holidayPolicy: "applies" }, "2026-03-09", calendar)).toBe(true);
    expect(ruleAppliesOnDate({ holidayPolicy: "excluded" }, "2026-03-10", calendar)).toBe(true);
  });
  it("returns unknown for missing/out-of-range calendar and unsupported exceptions", () => {
    expect(ruleAppliesOnDate({ holidayPolicy: "applies" }, "2026-03-09", null)).toBeNull();
    expect(isMelbournePublicHoliday("2027-01-01", calendar)).toBeNull();
    expect(isMelbournePublicHoliday("2026-02-30", calendar)).toBeNull();
    expect(ruleAppliesOnDate({ holidayPolicy: "date_exceptions" }, "2026-03-09", calendar)).toBeNull();
    expect(ruleAppliesOnDate({ holidayPolicy: "unknown" }, "2026-03-09", calendar)).toBeNull();
    expect(isMelbournePublicHoliday("2026-03-09", { ...calendar, dates: ["bad"] })).toBeNull();
  });
});
