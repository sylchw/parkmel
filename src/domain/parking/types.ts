/** Schema v1. Complete means structurally complete, not legally verified. */
export type RuleType = "free" | "time_limit" | "fee" | "clearway" | "permit" |
  "loading" | "accessible" | "no_parking" | "no_stopping" | "towaway" | "conditional" | "unknown";
export type FeeStatus = "free" | "paid" | "unknown";
export type HolidayPolicy = "applies" | "excluded" | "date_exceptions" | "unknown";
export interface TimePeriod {
  dayOfWeek: number; // Sunday=0; Saturday=6
  startTime: number; // integer minutes [0, 1439]
  endTime: number; // exclusive end [1, 1440]; midnight is 1440
}
export interface HolidayException { date: string; name?: string }
export interface RuleSource {
  type: "official" | "community" | "imported";
  identifier: string;
  evidenceKind: "community_entry" | "field" | "licensed_dataset" | "street_view" | "unknown";
  observedAt: string; // explicit-offset instant of observation
  submittedAt: string;
  sourceDate: string | null; // image/dataset date, distinct from submission
  reference?: string;
}
export interface ParkingRule {
  id: string;
  extent?: {start:number;end:number}; // fraction along this junction-to-junction side
  type: RuleType;
  periods: TimePeriod[]; // empty is incomplete; never implicitly 24/7
  feeStatus: FeeStatus;
  feeCents?: number; // optional amount, not proof of free eligibility
  maxDurationMinutes?: number;
  permitCondition: "none" | "required" | "unknown";
  holidayPolicy: HolidayPolicy;
  holidayExceptions?: HolidayException[];
  source: RuleSource;
}
export interface ParkingSchedule {
  schemaVersion: 1;
  sectionId: string;
  geometryVersion: number;
  completeness: "complete" | "draft" | "unknown";
  coverage: "full_schedule" | "partial" | "unknown";
  verification: "unverified" | "community_verified" | "admin_verified";
  confidenceLevel: 1 | 2 | 3 | 4 | 5;
  lastVerifiedAt: string | null;
  changeState: "none" | "change_reported" | "disputed";
  rules: ParkingRule[];
}
export interface ParkingStay { arrival: string; departure: string }
export type Eligibility = "eligible_free" | "eligible_paid" | "restricted" | "unknown";
export type ReasonCode = "allowed" | "paid_period" | "prohibited" | "permit_required" |
  "special_vehicle_required" | "duration_exceeded" | "incomplete_schedule" |
  "unverified" | "stale" | "change_reported" | "unsupported_semantics" |
  "unknown_fee" | "unknown_holiday" | "invalid_input" | "outside_signed_hours";
export interface EvaluationResult {
  eligibility: Eligibility;
  reasonCodes: ReasonCode[];
  appliedRuleIds: string[];
  explanation: string;
  earliestTransition: string | null;
}
export interface EvaluationContext {
  stay: ParkingStay;
  schedule: ParkingSchedule;
  timezone: "Australia/Melbourne";
  publicHolidays: string[] | null; // null means unavailable, not no holidays
  vehicleContext: "ordinary_no_permit";
  evaluatedAt: string;
}
