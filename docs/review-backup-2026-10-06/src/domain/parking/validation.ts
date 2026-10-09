import {
  ParkingRule,
  ParkingStay,
  TimePeriod,
  HolidayException,
  RuleSource,
} from "./types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const MINUTES_PER_DAY = 24 * 60;

function isValidTimePeriod(period: TimePeriod): boolean {
  if (!Number.isInteger(period.dayOfWeek) || period.dayOfWeek < 0 || period.dayOfWeek > 6) {
    return false;
  }
  if (!Number.isInteger(period.startTime) || period.startTime < 0 || period.startTime >= MINUTES_PER_DAY) {
    return false;
  }
  if (!Number.isInteger(period.endTime) || period.endTime < 0 || period.endTime >= MINUTES_PER_DAY) {
    return false;
  }
  if (period.endTime <= period.startTime) {
    return false;
  }
  return true;
}

function isValidHolidayException(exception: HolidayException): boolean {
  if (typeof exception.date !== "string") {
    return false;
  }
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(exception.date)) {
    return false;
  }
  const [year, month, day] = exception.date.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isValidRuleSource(source: RuleSource): boolean {
  if (typeof source.type !== "string" || !["official", "community", "imported"].includes(source.type)) {
    return false;
  }
  if (typeof source.identifier !== "string" || source.identifier.length === 0) {
    return false;
  }
  if (typeof source.capturedAt !== "string" || isNaN(Date.parse(source.capturedAt))) {
    return false;
  }
  return true;
}

export function validateParkingRule(rule: ParkingRule): ValidationResult {
  const errors: string[] = [];

  if (typeof rule.id !== "string" || rule.id.length === 0) {
    errors.push("Rule id must be a non-empty string");
  }

  const validTypes = ["free", "time_limit", "fee", "clearway", "permit", "loading"];
  if (!validTypes.includes(rule.type)) {
    errors.push(`Rule type must be one of: ${validTypes.join(", ")}`);
  }

  if (!Array.isArray(rule.periods)) {
    errors.push("Rule periods must be an array");
  } else {
    rule.periods.forEach((period, index) => {
      if (!isValidTimePeriod(period)) {
        errors.push(`Period at index ${index} is invalid`);
      }
    });
  }

  if (rule.type === "time_limit") {
    if (rule.maxDurationMinutes === undefined) {
      errors.push("maxDurationMinutes is required for time_limit rules");
    } else if (!Number.isInteger(rule.maxDurationMinutes) || rule.maxDurationMinutes <= 0) {
      errors.push("maxDurationMinutes must be a positive integer");
    }
  }

  if (rule.type === "fee") {
    if (rule.feeCents === undefined) {
      errors.push("feeCents is required for fee rules");
    } else if (!Number.isInteger(rule.feeCents) || rule.feeCents < 0) {
      errors.push("feeCents must be a non-negative integer");
    }
  }

  if (rule.holidayExceptions) {
    if (!Array.isArray(rule.holidayExceptions)) {
      errors.push("holidayExceptions must be an array");
    } else {
      rule.holidayExceptions.forEach((exception, index) => {
        if (!isValidHolidayException(exception)) {
          errors.push(`Holiday exception at index ${index} is invalid`);
        }
      });
    }
  }

  if (!isValidRuleSource(rule.source)) {
    errors.push("Rule source is invalid");
  }

  if (typeof rule.lastVerifiedAt !== "string" || isNaN(Date.parse(rule.lastVerifiedAt))) {
    errors.push("lastVerifiedAt must be a valid ISO 8601 timestamp");
  }

  const validConfidence = ["verified", "reported", "inferred"];
  if (!validConfidence.includes(rule.confidence)) {
    errors.push(`Confidence must be one of: ${validConfidence.join(", ")}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateParkingStay(stay: ParkingStay): ValidationResult {
  const errors: string[] = [];

  if (typeof stay.arrival !== "string" || isNaN(Date.parse(stay.arrival))) {
    errors.push("Arrival must be a valid ISO 8601 timestamp");
  }

  if (typeof stay.departure !== "string" || isNaN(Date.parse(stay.departure))) {
    errors.push("Departure must be a valid ISO 8601 timestamp");
  }

  if (errors.length === 0) {
    const arrivalTime = Date.parse(stay.arrival);
    const departureTime = Date.parse(stay.departure);
    if (departureTime <= arrivalTime) {
      errors.push("Departure must be after arrival");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}