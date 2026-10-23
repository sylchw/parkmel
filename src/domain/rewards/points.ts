import { instantToMelbourneLocal } from "../parking/time";
export const CONFIRMATION_COOLDOWN_MS = 90 * 86_400_000;
export const DAILY_CONFIRMATION_CAP = 10;
export type RewardKind = "annotation" | "correction" | "confirmation";
export interface RewardAction {
  actionKey: string;
  userId: string;
  sectionId: string;
  revisionId: string;
  kind: RewardKind;
  status: "accepted" | "pending" | "rejected";
  eligible: boolean;
  complete: boolean;
  substantive: boolean;
  independent: boolean;
  suspectedFarming: boolean;
  revisionAuthorId: string;
  priority: "primary" | "adjacent" | "residential";
  observedAt: number;
}
/** Awarded events only, supplied from the server ledger; no pending/client totals. */
export interface RewardHistory {
  actionKey: string; userId: string; sectionId: string; revisionId: string;
  kind: RewardKind; awardedAt: number; observedAt: number;
}
export type RewardReason = "awarded" | "not_accepted" | "ineligible" | "incomplete" |
  "not_substantive" | "not_independent" | "self_confirmation" | "suspected_farming" |
  "duplicate" | "cooldown" | "no_new_observation" | "daily_cap" | "invalid_input";
/** Pure eligibility only. Q36 must enforce all uniqueness/caps atomically. */
export function calculateReward(action: RewardAction, history: readonly RewardHistory[], now: number): {
  points: number; reason: RewardReason;
} {
  const no = (reason: RewardReason) => ({ points: 0, reason });
  if (!Number.isSafeInteger(now) || now < 0 || !Number.isSafeInteger(action.observedAt) ||
      action.observedAt < 0 || action.observedAt > now ||
      ![action.actionKey, action.userId, action.sectionId, action.revisionId, action.revisionAuthorId].every(s => s.trim()) ||
      !["annotation", "correction", "confirmation"].includes(action.kind) ||
      !["primary", "adjacent", "residential"].includes(action.priority) ||
      history.some(h => !Number.isSafeInteger(h.awardedAt) || h.awardedAt < 0 || h.awardedAt > now ||
        !Number.isSafeInteger(h.observedAt) || h.observedAt < 0 || h.observedAt > h.awardedAt)) return no("invalid_input");
  if (action.status !== "accepted") return no("not_accepted");
  if (!action.eligible) return no("ineligible");
  if (!action.complete) return no("incomplete");
  if (action.suspectedFarming) return no("suspected_farming");
  if (history.some(h => h.actionKey === action.actionKey || (h.userId === action.userId && h.revisionId === action.revisionId &&
      (action.kind !== "confirmation" || h.kind !== "confirmation")))) {
    return no("duplicate");
  }
  if (action.kind !== "confirmation") {
    if (!action.substantive) return no("not_substantive");
    return { points: action.priority === "primary" ? 4 : action.priority === "adjacent" ? 2 : 1, reason: "awarded" };
  }
  if (action.revisionAuthorId === action.userId) return no("self_confirmation");
  if (!action.independent) return no("not_independent");
  const confirmations = history.filter(h => h.userId === action.userId && h.kind === "confirmation");
  const sameSection = confirmations.filter(h => h.sectionId === action.sectionId);
  if (sameSection.some(h => now - h.awardedAt < CONFIRMATION_COOLDOWN_MS)) return no("cooldown");
  if (sameSection.some(h => action.observedAt <= h.observedAt)) return no("no_new_observation");
  // Day cap uses Melbourne calendar days, not UTC or rolling 24 hours.
  const day = instantToMelbourneLocal(new Date(now)).slice(0, 10);
  if (confirmations.filter(h => instantToMelbourneLocal(new Date(h.awardedAt)).slice(0, 10) === day).length >= DAILY_CONFIRMATION_CAP) {
    return no("daily_cap");
  }
  return { points: 1, reason: "awarded" };
}
