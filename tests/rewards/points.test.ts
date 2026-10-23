import { describe, expect, it } from "vitest";
import { calculateReward, CONFIRMATION_COOLDOWN_MS } from "../../src/domain/rewards/points";
import type { RewardAction, RewardHistory } from "../../src/domain/rewards/points";
const now = Date.parse("2026-10-07T00:00:00Z");
const action: RewardAction = { actionKey: "new", userId: "u", sectionId: "s", revisionId: "r",
  kind: "annotation", status: "accepted", eligible: true, complete: true, substantive: true,
  independent: true, suspectedFarming: false, revisionAuthorId: "author", priority: "primary", observedAt: now };
const event = (patch: Partial<RewardHistory> = {}): RewardHistory => ({ actionKey: "old", userId: "u",
  sectionId: "s", revisionId: "older", kind: "confirmation", awardedAt: now - CONFIRMATION_COOLDOWN_MS,
  observedAt: now - CONFIRMATION_COOLDOWN_MS, ...patch });
describe("accepted reward eligibility", () => {
  it.each([["primary", 4], ["adjacent", 2], ["residential", 1]] as const)("awards %s priority %i points", (priority, points) => {
    for (const kind of ["annotation", "correction"] as const) {
      expect(calculateReward({ ...action, priority, kind }, [], now).points).toBe(points);
    }
  });
  it("does not take parking category as a reward input", () => {
    // Pricing/prohibition cannot alter the server-maintained tier award.
    expect(calculateReward(action, [], now)).toEqual({ points: 4, reason: "awarded" });
  });
  it.each([
    [{ status: "pending" }, "not_accepted"], [{ eligible: false }, "ineligible"],
    [{ complete: false }, "incomplete"], [{ substantive: false }, "not_substantive"],
    [{ suspectedFarming: true }, "suspected_farming"],
    [{ kind: "confirmation", revisionAuthorId: "u" }, "self_confirmation"],
    [{ kind: "confirmation", independent: false }, "not_independent"],
  ] as [Partial<RewardAction>, string][])("rejects %j", (patch, reason) => {
    expect(calculateReward({ ...action, ...patch }, [], now)).toEqual({ points: 0, reason });
  });
  it("rejects repeated action keys and author/confirmation stacking on the same revision", () => {
    expect(calculateReward(action, [event({ actionKey: "new" })], now).reason).toBe("duplicate");
    expect(calculateReward({ ...action, kind: "confirmation" }, [event({ kind: "annotation", revisionId: "r" })], now).reason).toBe("duplicate");
  });
  it("uses an exact 90-day cooldown and requires a new observation", () => {
    const confirm = { ...action, kind: "confirmation" as const };
    expect(calculateReward(confirm, [event({ awardedAt: now - CONFIRMATION_COOLDOWN_MS + 1 })], now).reason).toBe("cooldown");
    expect(calculateReward(confirm, [event()], now).points).toBe(1);
    expect(calculateReward(confirm, [event({ revisionId: "r" })], now).points).toBe(1);
    expect(calculateReward({ ...confirm, observedAt: now - CONFIRMATION_COOLDOWN_MS }, [event()], now).reason).toBe("no_new_observation");
  });
  it("caps ten confirmations on a Melbourne day, with midnight resetting the day cap", () => {
    const history = Array.from({ length: 10 }, (_, i) => event({ sectionId: `other${i}`, revisionId: `other${i}`,
      awardedAt: now - 1_000, observedAt: now - 1_000 }));
    expect(calculateReward({ ...action, kind: "confirmation" }, history, now).reason).toBe("daily_cap");
    const nextDay = Date.parse("2026-10-07T13:00:00Z");
    expect(calculateReward({ ...action, kind: "confirmation", observedAt: nextDay }, history, nextDay).points).toBe(1);
  });
  it("rejects future observations and corrupt history", () => {
    expect(calculateReward({ ...action, observedAt: now + 1 }, [], now).reason).toBe("invalid_input");
    expect(calculateReward(action, [event({ awardedAt: NaN })], now).reason).toBe("invalid_input");
  });
});
