import { ParkingRule, TimePeriod, HolidayException, RuleSource } from "../parking/types";

export const CANONICAL_SCHEMA_VERSION = 1;

export interface CanonicalSchedule {
  schemaVersion: number;
  rule: ParkingRule;
  hash: string;
}

function normalizeTimePeriod(period: TimePeriod): TimePeriod {
  return {
    dayOfWeek: period.dayOfWeek,
    startTime: period.startTime,
    endTime: period.endTime,
  };
}

function normalizeHolidayException(exception: HolidayException): HolidayException {
  return {
    date: exception.date,
    ...(exception.name !== undefined ? { name: exception.name } : {}),
  };
}

function normalizeRuleSource(source: RuleSource): RuleSource {
  return {
    type: source.type,
    identifier: source.identifier,
    ...(source.reference !== undefined ? { reference: source.reference } : {}),
    capturedAt: source.capturedAt,
  };
}

function normalizeParkingRule(rule: ParkingRule): ParkingRule {
  const periods = [...rule.periods].map(normalizeTimePeriod).sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
    if (a.startTime !== b.startTime) return a.startTime - b.startTime;
    return a.endTime - b.endTime;
  });

  const holidayExceptions = rule.holidayExceptions
    ? [...rule.holidayExceptions].map(normalizeHolidayException).sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        const aName = a.name ?? "";
        const bName = b.name ?? "";
        if (aName !== bName) return aName < bName ? -1 : 1;
        return 0;
      })
    : undefined;

  return {
    id: rule.id,
    type: rule.type,
    periods,
    ...(rule.maxDurationMinutes !== undefined ? { maxDurationMinutes: rule.maxDurationMinutes } : {}),
    ...(rule.feeCents !== undefined ? { feeCents: rule.feeCents } : {}),
    ...(holidayExceptions !== undefined ? { holidayExceptions } : {}),
    source: normalizeRuleSource(rule.source),
    lastVerifiedAt: rule.lastVerifiedAt,
    confidence: rule.confidence,
  };
}

function canonicalizeJson(value: unknown): string {
  if (value === null || value === undefined) {
    return "null";
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalizeJson).join(",")}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalizeJson(v)}`).join(",")}}`;
  }
  throw new Error(`Unsupported canonical value type: ${typeof value}`);
}

function simpleHash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function canonicalizeSchedule(rule: ParkingRule): CanonicalSchedule {
  const normalized = normalizeParkingRule(rule);
  const canonical = canonicalizeJson(normalized);
  const hash = simpleHash(`${CANONICAL_SCHEMA_VERSION}:${canonical}`);
  return {
    schemaVersion: CANONICAL_SCHEMA_VERSION,
    rule: normalized,
    hash,
  };
}

export function schedulesAgree(a: ParkingRule, b: ParkingRule): boolean {
  return canonicalizeSchedule(a).hash === canonicalizeSchedule(b).hash;
}