/** Accept unknown JSON and return errors instead of throwing on missing nested objects. */
export interface ValidationResult { valid: boolean; errors: string[] }
type Obj = Record<string, unknown>;
const object = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const integer = (v: unknown, min: number, max = Number.MAX_SAFE_INTEGER): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= min && v <= max;
const oneOf = (v: unknown, choices: readonly string[]): boolean => typeof v === "string" && choices.includes(v);
const result = (errors: string[]): ValidationResult => ({ valid: errors.length === 0, errors });

function dateOnly(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v + "T00:00:00Z");
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v;
}
function instant(v: unknown): v is string {
  if (typeof v !== "string") return false;
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.exec(v);
  if (!m || !dateOnly(m[1]) || +m[2] > 23 || +m[3] > 59 || +m[4] > 59) return false;
  if (m[5] !== "Z") {
    const [h, n] = m[5].slice(1).split(":").map(Number);
    if (h > 14 || n > 59 || (h === 14 && n !== 0)) return false;
  }
  return Number.isFinite(Date.parse(v));
}
function sourceValid(v: unknown): boolean {
  if (!object(v) || !oneOf(v.type, ["official", "community", "imported"]) || !text(v.identifier)) return false;
  if (!oneOf(v.evidenceKind, ["community_entry", "field", "licensed_dataset", "street_view", "unknown"])) return false;
  if (!instant(v.observedAt) || !instant(v.submittedAt) || Date.parse(v.observedAt) > Date.parse(v.submittedAt)) return false;
  if (v.sourceDate !== null && !dateOnly(v.sourceDate)) return false;
  if (v.evidenceKind === "street_view" && !dateOnly(v.sourceDate)) return false;
  if (typeof v.sourceDate === "string" && v.sourceDate > v.observedAt.slice(0, 10)) return false;
  return v.reference === undefined || text(v.reference);
}
export function validateParkingRule(input: unknown): ValidationResult {
  if (!object(input)) return result(["Rule must be an object"]);
  const e: string[] = [];
  if (!text(input.id)) e.push("Rule id must be a non-empty string");
  if (!oneOf(input.type, ["free", "time_limit", "fee", "clearway", "permit", "loading", "accessible", "no_parking", "no_stopping","towaway", "conditional", "unknown"])) e.push("Rule type is invalid");
  if (!Array.isArray(input.periods) || input.periods.length === 0) e.push("Rule periods must explicitly describe active times");
  else input.periods.forEach((v, i) => {
    if (!object(v) || !integer(v.dayOfWeek, 0, 6) || !integer(v.startTime, 0, 1439) || !integer(v.endTime, 1, 1440) || v.endTime <= v.startTime) e.push(`Period at index ${i} is invalid; split overnight periods at midnight`);
  });
  if (!oneOf(input.feeStatus, ["free", "paid", "unknown"])) e.push("Explicit feeStatus is required");
  if (input.type === "free" && input.feeStatus !== "free") e.push("Free rule requires explicit free fee status");
  if (input.type === "fee" && input.feeStatus !== "paid") e.push("Fee rule requires paid fee status");
  if (input.feeCents !== undefined && !integer(input.feeCents, 0)) e.push("feeCents must be a non-negative integer");
  if (input.feeStatus === "free" && input.feeCents !== undefined && input.feeCents !== 0) e.push("Free status cannot have a positive fee");
  if (input.type === "time_limit" && !integer(input.maxDurationMinutes, 1)) e.push("Positive maxDurationMinutes is required for time_limit rules");
  else if (input.maxDurationMinutes !== undefined && !integer(input.maxDurationMinutes, 1)) e.push("maxDurationMinutes must be positive");
  if (!oneOf(input.permitCondition, ["none", "required", "unknown"])) e.push("Explicit permit condition is required");
  if (input.type === "permit" && input.permitCondition !== "required") e.push("Permit rule requires a permit condition");
  if (!oneOf(input.holidayPolicy, ["applies", "excluded", "date_exceptions", "unknown"])) e.push("Explicit holiday policy is required");
  if (input.holidayExceptions !== undefined && (!Array.isArray(input.holidayExceptions) || !input.holidayExceptions.every(v => object(v) && dateOnly(v.date) && (v.name === undefined || text(v.name))))) e.push("Holiday exceptions must contain valid dates");
  if (input.holidayPolicy === "date_exceptions" && (!Array.isArray(input.holidayExceptions) || input.holidayExceptions.length === 0)) e.push("Date-exception policy needs explicit dates");
  if (input.holidayPolicy !== "date_exceptions" && Array.isArray(input.holidayExceptions) && input.holidayExceptions.length > 0) e.push("Exception dates require date_exceptions policy");
  if (input.extent !== undefined && (!object(input.extent) || typeof input.extent.start!=="number" || typeof input.extent.end!=="number" || !Number.isFinite(input.extent.start) || !Number.isFinite(input.extent.end) || input.extent.start<0 || input.extent.end>1 || input.extent.end<=input.extent.start || !["loading","accessible","no_parking","no_stopping","towaway","clearway","permit"].includes(String(input.type)))) e.push("Local extent needs a restricted zone and valid start/end fractions");
  if (!sourceValid(input.source)) e.push("Rule source is invalid or source dates are inconsistent");
  return result(e);
}
export function validateParkingSchedule(input: unknown): ValidationResult {
  if (!object(input)) return result(["Schedule must be an object"]);
  const e: string[] = [];
  if (input.schemaVersion !== 1) e.push("Unsupported schemaVersion");
  if (!text(input.sectionId) || !integer(input.geometryVersion, 1)) e.push("Section and geometry version required");
  if (!oneOf(input.completeness, ["complete", "draft", "unknown"])) e.push("Completeness must be explicit");
  if (!oneOf(input.coverage, ["full_schedule", "partial", "unknown"])) e.push("Coverage must be explicit");
  if (input.completeness === "complete" && input.coverage !== "full_schedule") e.push("Complete schedule requires full schedule coverage");
  if (!oneOf(input.verification, ["unverified", "community_verified", "admin_verified"])) e.push("Verification state invalid");
  if (!integer(input.confidenceLevel, 1, 5)) e.push("Confidence level must be 1–5");
  if (input.verification === "unverified" && integer(input.confidenceLevel, 3, 5)) e.push("Levels 3–5 require verification");
  if (!oneOf(input.changeState, ["none", "change_reported", "disputed"])) e.push("Change state invalid");
  if (input.lastVerifiedAt !== null && !instant(input.lastVerifiedAt)) e.push("lastVerifiedAt must be null or an explicit-offset instant");
  if (input.verification !== "unverified" && !instant(input.lastVerifiedAt)) e.push("Verified schedule requires verification time");
  if (input.verification === "unverified" && input.lastVerifiedAt !== null) e.push("Unverified schedule cannot claim verification time");
  if (input.verification !== "unverified" && integer(input.confidenceLevel, 1, 5) && input.confidenceLevel < 3) e.push("Verified schedule requires confidence level at least 3");
  if (!Array.isArray(input.rules) || input.rules.length === 0) e.push("Schedule needs at least one explicit rule");
  else {
    input.rules.forEach((v, i) => e.push(...validateParkingRule(v).errors.map(x => `Rule ${i}: ${x}`)));
    const ids = input.rules.filter(object).map(v => v.id);
    if (new Set(ids).size !== ids.length) e.push("Duplicate rule IDs");
  }
  return result(e);
}
export function validateParkingStay(input: unknown): ValidationResult {
  if (!object(input)) return result(["Stay must be an object"]);
  const e: string[] = [];
  if (!instant(input.arrival)) e.push("Arrival must be an explicit-offset ISO timestamp");
  if (!instant(input.departure)) e.push("Departure must be an explicit-offset ISO timestamp");
  if (e.length === 0 && Date.parse(input.departure as string) <= Date.parse(input.arrival as string)) e.push("Departure must be after arrival");
  return result(e);
}
