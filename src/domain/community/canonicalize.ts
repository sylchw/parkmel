import type { ParkingSchedule, ParkingRule } from "../parking/types";
import { validateParkingSchedule } from "../parking/validation";

export const CANONICAL_SCHEMA_VERSION = 1;
const sortedUnique = (values: string[]) => [...new Set(values)].sort();

function normalizeRule(rule: ParkingRule): string {
  const periods = sortedUnique(rule.periods.map(p => JSON.stringify([p.dayOfWeek, p.startTime, p.endTime])))
    .map(p => JSON.parse(p) as number[])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
  return JSON.stringify({
    type: rule.type,
    periods,
    feeStatus: rule.feeStatus,
    feeCents: rule.feeStatus === "free" ? 0 : rule.feeCents ?? null,
    maxDurationMinutes: rule.maxDurationMinutes ?? null,
    permitCondition: rule.permitCondition,
    holidayPolicy: rule.holidayPolicy,
    ...(rule.extent?{extent:rule.extent}:{}),
    holidayDates: sortedUnique((rule.holidayExceptions ?? []).map(x => x.date)),
  });
}

/** Complete semantic identity; observation and display metadata never enter agreement. */
export function canonicalPayload(schedule: ParkingSchedule): string {
  const checked = validateParkingSchedule(schedule);
  if (!checked.valid) throw new Error(`Invalid schedule: ${checked.errors.join("; ")}`);
  if (schedule.completeness !== "complete" || schedule.coverage !== "full_schedule") {
    throw new Error("Only complete schedules can be compared for agreement");
  }
  return JSON.stringify({
    schemaVersion: CANONICAL_SCHEMA_VERSION,
    sectionId: schedule.sectionId,
    geometryVersion: schedule.geometryVersion,
    rules: sortedUnique(schedule.rules.map(normalizeRule)).map(x => JSON.parse(x) as unknown),
  });
}

/** Web Crypto works in the local Node runtime and secure browser contexts. */
export async function canonicalizeSchedule(schedule: ParkingSchedule) {
  const canonical = canonicalPayload(schedule);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
  return { schemaVersion: CANONICAL_SCHEMA_VERSION, canonical, hash };
}

export function schedulesAgree(a: ParkingSchedule, b: ParkingSchedule): boolean {
  // Compare full canonical content, not hashes alone, even with SHA-256.
  return canonicalPayload(a) === canonicalPayload(b);
}
