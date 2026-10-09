import { describe, expect, it } from "vitest";
import { createGuestAllowance, reduceGuestAllowance, remainingGuestMs,
  GUEST_RESET_MS, MAX_TICK_MS } from "../../src/domain/guest/allowance";
const clock = (monotonicMs: number, epochMs = 1_000 + monotonicMs) => ({ monotonicMs, epochMs });
describe("guest allowance", () => {
  it("exhausts exactly at 120 cumulative foreground seconds", () => {
    let state = createGuestAllowance(clock(0));
    for (let t = 5_000; t <= 120_000; t += 5_000) state = reduceGuestAllowance(state, "tick", clock(t));
    expect(remainingGuestMs(state)).toBe(0);
    expect(state.persisted.consumedMs).toBe(120_000);
    expect(remainingGuestMs(reduceGuestAllowance(state, "reload", clock(120_000)))).toBe(0);
  });
  it("reload resets only the page allowance, including hydration on a new clock", () => {
    const used = reduceGuestAllowance(createGuestAllowance(clock(0)), "tick", clock(5_000));
    const reloaded = reduceGuestAllowance(used, "reload", clock(6_000));
    expect(reloaded.pageConsumedMs).toBe(0);
    expect(remainingGuestMs(reloaded)).toBe(114_000);
    expect(remainingGuestMs(createGuestAllowance(clock(0, 8_000), reloaded.persisted))).toBe(114_000);
  });
  it("settles foreground time on hide and pauses until show", () => {
    let state = reduceGuestAllowance(createGuestAllowance(clock(0)), "hide", clock(2_000));
    state = reduceGuestAllowance(state, "tick", clock(50_000));
    state = reduceGuestAllowance(state, "show", clock(100_000));
    expect(state.persisted.consumedMs).toBe(2_000);
    state = reduceGuestAllowance(state, "tick", clock(101_000));
    expect(state.persisted.consumedMs).toBe(3_000);
  });
  it("caps jumps and ignores backwards monotonic movement without double counting", () => {
    let state = reduceGuestAllowance(createGuestAllowance(clock(0)), "tick", clock(60_000));
    expect(state.persisted.consumedMs).toBe(MAX_TICK_MS);
    state = reduceGuestAllowance(state, "tick", clock(59_000));
    state = reduceGuestAllowance(state, "tick", clock(61_000));
    expect(state.persisted.consumedMs).toBe(MAX_TICK_MS + 1_000);
  });
  it("resets at the 30-day policy boundary, never on a backwards wall clock", () => {
    const persisted = { startedAt: 1_000, consumedMs: 120_000 };
    expect(remainingGuestMs(createGuestAllowance(clock(0, GUEST_RESET_MS + 999), persisted))).toBe(0);
    expect(remainingGuestMs(createGuestAllowance(clock(0, GUEST_RESET_MS + 1_000), persisted))).toBe(120_000);
    expect(remainingGuestMs(createGuestAllowance(clock(0, 0), persisted))).toBe(0);
    const state = createGuestAllowance(clock(0), persisted);
    expect(reduceGuestAllowance(state, "hide", clock(10, GUEST_RESET_MS + 1_000)).foreground).toBe(false);
  });
  it("rejects corrupted persistence and nonfinite clocks", () => {
    expect(() => createGuestAllowance(clock(NaN))).toThrow();
    expect(() => createGuestAllowance(clock(0), { startedAt: 0, consumedMs: -1 })).toThrow();
    expect(() => createGuestAllowance(clock(0), { startedAt: 0, consumedMs: 120_001 })).toThrow();
  });
});
