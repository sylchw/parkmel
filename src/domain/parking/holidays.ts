import type { HolidayPolicy, ParkingRule } from "./types";
export interface HolidayCalendar {
  locality: "metropolitan_melbourne";
  from: string;
  through: string;
  dates: readonly string[];
  source: string;
  reviewedAt: string;
}
/** Reviewed 7 October 2026 against Business Victoria; never a regional calendar. */
export const MELBOURNE_HOLIDAYS_2026: HolidayCalendar = {
  locality: "metropolitan_melbourne", from: "2026-01-01", through: "2026-12-31",
  dates: ["2026-01-01", "2026-01-26", "2026-03-09", "2026-04-03", "2026-04-04",
    "2026-04-05", "2026-04-06", "2026-04-25", "2026-06-08", "2026-09-25",
    "2026-11-03", "2026-12-25", "2026-12-26", "2026-12-28"],
  source: "https://business.vic.gov.au/business-information/public-holidays/victorian-public-holidays-2026",
  reviewedAt: "2026-10-07",
};
function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
/** Rule 318(3): sign transcription must explicitly distinguish named days from none. */
export function interpretHolidayPolicy(
  days: "named" | "none" | "unknown",
  override: "includes" | "excludes" | "none" | "unsupported" = "none",
): HolidayPolicy {
  if (override === "includes") return "applies";
  if (override === "excludes") return "excluded";
  if (override !== "none" || days === "unknown") return "unknown";
  return days === "named" ? "excluded" : days === "none" ? "applies" : "unknown";
}
export function isMelbournePublicHoliday(date: string, calendar: HolidayCalendar | null): boolean | null {
  if (!validDate(date) || !calendar || calendar.locality !== "metropolitan_melbourne" ||
      !validDate(calendar.from) || !validDate(calendar.through) || calendar.from > calendar.through ||
      date < calendar.from || date > calendar.through || !calendar.source.trim() ||
      !validDate(calendar.reviewedAt) || !calendar.dates.every(d => validDate(d) && d >= calendar.from && d <= calendar.through)) return null;
  return calendar.dates.includes(date);
}
/** Only holiday applicability, not proof of permission, price or absence of other signs. */
export function ruleAppliesOnDate(
  rule: Pick<ParkingRule, "holidayPolicy">, date: string, calendar: HolidayCalendar | null,
): boolean | null {
  const holiday = isMelbournePublicHoliday(date, calendar);
  if (holiday === null || rule.holidayPolicy === "unknown" || rule.holidayPolicy === "date_exceptions") return null;
  if (rule.holidayPolicy === "applies") return true;
  if (rule.holidayPolicy === "excluded") return !holiday;
  return null;
}
