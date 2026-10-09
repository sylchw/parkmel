export const GUEST_ALLOWANCE_MS = 120_000;
export const GUEST_RESET_MS = 30 * 24 * 60 * 60 * 1000;
// Reconcile at least every five seconds; long missing signals cannot drain a session.
export const MAX_TICK_MS = 5_000;
export interface PersistedAllowance { startedAt: number; consumedMs: number }
export interface GuestAllowance {
  persisted: PersistedAllowance;
  pageConsumedMs: number;
  foreground: boolean;
  lastMonotonicMs: number;
}
export interface AllowanceClock { monotonicMs: number; epochMs: number }
export type AllowanceAction = "tick" | "hide" | "show" | "reload";
function validNumber(value: number): boolean { return Number.isFinite(value) && value >= 0; }
function validateClock(clock: AllowanceClock): void {
  if (!validNumber(clock.monotonicMs) || !validNumber(clock.epochMs)) {
    throw new RangeError("Invalid allowance clock");
  }
}
export function createGuestAllowance(
  clock: AllowanceClock, persisted?: PersistedAllowance, foreground = true,
): GuestAllowance {
  validateClock(clock);
  if (persisted && (!validNumber(persisted.startedAt) ||
      !validNumber(persisted.consumedMs) || persisted.consumedMs > GUEST_ALLOWANCE_MS)) {
    throw new RangeError("Invalid persisted allowance");
  }
  const reset = !persisted || clock.epochMs - persisted.startedAt >= GUEST_RESET_MS;
  return { persisted: reset ? { startedAt: clock.epochMs, consumedMs: 0 } : { ...persisted! },
    pageConsumedMs: 0, foreground, lastMonotonicMs: clock.monotonicMs };
}
export function remainingGuestMs(state: GuestAllowance): number {
  return Math.max(0, Math.min(GUEST_ALLOWANCE_MS - state.pageConsumedMs,
    GUEST_ALLOWANCE_MS - state.persisted.consumedMs));
}
/** Monotonic time meters activity; epoch time is used only for the policy reset. */
export function reduceGuestAllowance(
  state: GuestAllowance, action: AllowanceAction, clock: AllowanceClock,
): GuestAllowance {
  validateClock(clock);
  if (!["tick", "hide", "show", "reload"].includes(action)) throw new RangeError("Invalid action");
  if (clock.epochMs - state.persisted.startedAt >= GUEST_RESET_MS) {
    return createGuestAllowance(clock, undefined,
      action === "hide" ? false : action === "show" || action === "reload" ? true : state.foreground);
  }
  const elapsed = state.foreground
    ? Math.min(MAX_TICK_MS, Math.max(0, clock.monotonicMs - state.lastMonotonicMs)) : 0;
  const next = { ...state, persisted: { ...state.persisted,
    consumedMs: Math.min(GUEST_ALLOWANCE_MS, state.persisted.consumedMs + elapsed) },
    pageConsumedMs: Math.min(GUEST_ALLOWANCE_MS, state.pageConsumedMs + elapsed),
    lastMonotonicMs: Math.max(state.lastMonotonicMs, clock.monotonicMs) };
  if (action === "hide") next.foreground = false;
  if (action === "show") next.foreground = true;
  if (action === "reload") { next.pageConsumedMs = 0; next.foreground = true; }
  return next;
}
