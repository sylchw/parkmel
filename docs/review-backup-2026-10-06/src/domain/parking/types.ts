// Domain types for parking rule evaluation

/**
 * Represents a time period in a parking rule.
 * Uses explicit day-of-week and time ranges to avoid ambiguity.
 */
export interface TimePeriod {
  /** Day of week: 0 = Sunday, 1 = Monday, ..., 6 = Saturday */
  dayOfWeek: number;
  /** Start time in minutes from midnight (0-1439) */
  startTime: number;
  /** End time in minutes from midnight (0-1439). Must be > startTime */
  endTime: number;
}

/**
 * Represents a public holiday exception.
 * If a rule has holiday exceptions, the rule does NOT apply on those days.
 */
export interface HolidayException {
  /** ISO date string (YYYY-MM-DD) for the specific holiday */
  date: string;
  /** Optional name of the holiday for display */
  name?: string;
}

/**
 * Represents a parking restriction rule.
 * This is the canonical form used by the rules engine.
 */
export interface ParkingRule {
  /** Unique identifier for the rule */
  id: string;
  /**
   * Type of restriction:
   * - "free": No restriction, parking is free
   * - "time_limit": Maximum parking duration
   * - "fee": Parking requires payment
   * - "clearway": No parking at all
   * - "permit": Permit holders only
   * - "loading": Loading/unloading only
   */
  type: "free" | "time_limit" | "fee" | "clearway" | "permit" | "loading";
  /**
   * Time periods when this rule applies.
   * Empty array means the rule applies 24/7.
   */
  periods: TimePeriod[];
  /**
   * For time_limit rules: maximum duration in minutes.
   * Required when type is "time_limit".
   */
  maxDurationMinutes?: number;
  /**
   * For fee rules: the fee amount in cents.
   * Required when type is "fee".
   */
  feeCents?: number;
  /**
   * Holiday exceptions: rule does NOT apply on these dates.
   * If present, the rule is suspended on listed holidays.
   */
  holidayExceptions?: HolidayException[];
  /**
   * Source information for provenance tracking.
   */
  source: RuleSource;
  /**
   * Timestamp when this rule was last verified (ISO 8601).
   */
  lastVerifiedAt: string;
  /**
   * Confidence level in this rule's accuracy.
   * - "verified": Confirmed by multiple sources or official data
   * - "reported": Single community report
   * - "inferred": Derived from pattern matching, lower confidence
   */
  confidence: "verified" | "reported" | "inferred";
}

/**
 * Source information for a parking rule.
 */
export interface RuleSource {
  /** Type of source */
  type: "official" | "community" | "imported";
  /** Identifier of the source (e.g., council name, user ID, import batch) */
  identifier: string;
  /** Optional URL or reference for the source */
  reference?: string;
  /** Timestamp when the source was captured */
  capturedAt: string;
}

/**
 * Represents a parking stay (arrival and departure times).
 */
export interface ParkingStay {
  /** Arrival time as ISO 8601 string */
  arrival: string;
  /** Departure time as ISO 8601 string */
  departure: string;
}

/**
 * Result of evaluating a parking stay against rules.
 */
export interface EvaluationResult {
  /**
   * Whether the stay qualifies as "free" parking.
   * - true: Stay is within free parking rules
   * - false: Stay violates at least one restriction
   * - null: Cannot determine (insufficient data, unknown semantics)
   */
  isFree: boolean | null;
  /**
   * Rules that were evaluated and their individual results.
   */
  ruleResults: RuleEvaluationResult[];
  /**
   * Human-readable explanation of the evaluation.
   */
  explanation: string;
  /**
   * If the stay is not free, the specific violations found.
   */
  violations: Violation[];
}

/**
 * Result of evaluating a single rule against a stay.
 */
export interface RuleEvaluationResult {
  ruleId: string;
  ruleType: ParkingRule["type"];
  /** Whether the stay overlaps with this rule's active periods */
  isActiveDuringStay: boolean;
  /** Whether the stay violates this rule */
  isViolation: boolean;
  /** Explanation of the evaluation */
  explanation: string;
}

/**
 * A specific violation found during evaluation.
 */
export interface Violation {
  ruleId: string;
  ruleType: ParkingRule["type"];
  /** Description of the violation */
  description: string;
  /** The time period during which the violation occurs */
  violationPeriod: TimePeriod | null;
}

/**
 * Context for rule evaluation.
 */
export interface EvaluationContext {
  /** The parking stay to evaluate */
  stay: ParkingStay;
  /** All rules that apply to the location */
  rules: ParkingRule[];
  /**
   * Optional: list of public holidays for the evaluation period.
   * If not provided, holiday exceptions in rules are ignored.
   */
  publicHolidays?: string[];
  /**
   * Optional: timezone identifier (e.g., "Australia/Melbourne").
   * Used for DST-aware time calculations.
   */
  timezone?: string;
}