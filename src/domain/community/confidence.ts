import type { ParkingSchedule } from "../parking/types";
import { canonicalPayload } from "./canonicalize";
export interface ConfidencePosition {
  contributorId: string;
  eligible: boolean;
  active: boolean;
  schedule: ParkingSchedule;
}
export interface ConfidenceResult {
  agreeingContributors: number;
  confidenceLevel: ParkingSchedule["confidenceLevel"];
  verification: ParkingSchedule["verification"];
}
/** Inputs are trusted server positions, never client-supplied totals or roles. */
export function calculateConfidence(
  schedule: ParkingSchedule, positions: readonly ConfidencePosition[], adminVerified = false,
): ConfidenceResult {
  const target = canonicalPayload(schedule);
  const byContributor = new Map<string, Set<string>>();
  for (const position of positions) {
    if (!position.active || !position.eligible || !position.contributorId.trim()) continue;
    const values = byContributor.get(position.contributorId) ?? new Set<string>();
    // Incomplete/malformed active records cannot provide agreement evidence.
    try { values.add(canonicalPayload(position.schedule)); }
    catch { values.add("invalid"); }
    byContributor.set(position.contributorId, values);
  }
  const count = [...byContributor.values()].filter(values => values.size === 1 && values.has(target)).length;
  const communityLevel = count >= 20 ? 5 : count >= 10 ? 4 : count >= 5 ? 3 : count >= 3 ? 2 : 1;
  return { agreeingContributors: count,
    confidenceLevel: adminVerified ? Math.max(3, communityLevel) as ConfidenceResult["confidenceLevel"] : communityLevel,
    verification: adminVerified ? "admin_verified" : count >= 5 ? "community_verified" : "unverified" };
}
