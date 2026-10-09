import type { ParkingSchedule } from "../parking/types";
import { canonicalPayload } from "./canonicalize";
import { calculateConfidence } from "./confidence";
import type { ConfidencePosition } from "./confidence";
export const CHANGE_WINDOW_MS = 168 * 60 * 60 * 1000;
export interface ChangeReport extends ConfidencePosition { reportedAt: number }
export interface ChangeWindowResult {
  state: ParkingSchedule["changeState"];
  counts: { canonical: string; contributors: number }[];
  promotionCandidate: ParkingSchedule | null;
  requiresEvidenceReview: boolean;
}
/** UTC epoch milliseconds supplied by the server. Window is [now - 168h, now]. */
export function evaluateChangeWindow(current: ParkingSchedule, reports: readonly ChangeReport[],
  now: number, previousState: ParkingSchedule["changeState"] = current.changeState): ChangeWindowResult {
  if (!Number.isSafeInteger(now) || now < 0) throw new RangeError("Invalid server time");
  if (!["none", "change_reported", "disputed"].includes(previousState)) throw new Error("Invalid prior change state");
  const currentCanonical = canonicalPayload(current);
  const candidates = new Map<string, ParkingSchedule>();
  const positions: ChangeReport[] = [];
  for (const report of reports) {
    if (!report.active || !report.eligible || !Number.isSafeInteger(report.reportedAt) ||
      report.reportedAt < now - CHANGE_WINDOW_MS || report.reportedAt > now ||
      report.schedule.sectionId !== current.sectionId || report.schedule.geometryVersion !== current.geometryVersion) continue;
    // Invalid active evidence is retained for conflict exclusion in the confidence helper.
    positions.push(report);
    try {
      const canonical = canonicalPayload(report.schedule);
      if (canonical !== currentCanonical) candidates.set(canonical, report.schedule);
    } catch { /* Draft/malformed schedules never become replacement candidates. */ }
  }
  const counts = [...candidates].map(([canonical, schedule]) => ({ canonical,
    contributors: calculateConfidence(schedule, positions).agreeingContributors })).sort((a, b) => a.canonical.localeCompare(b.canonical));
  const warningCandidates = counts.filter(candidate => candidate.contributors >= 3);
  const state = previousState === "disputed" || warningCandidates.length >= 2 ? "disputed"
    : previousState === "change_reported" || warningCandidates.length ? "change_reported" : "none";
  const replacement = state !== "disputed" ? counts.find(candidate => candidate.contributors >= 5) : undefined;
  return { state, counts, promotionCandidate: replacement ? candidates.get(replacement.canonical)! : null,
    // This helper grants no publication authority. Q32 must prove newer physical evidence atomically.
    requiresEvidenceReview: replacement !== undefined };
}
