import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startRunTimer } from "./run-timer";

function setup(canInterrupt: boolean) {
  const interrupt = vi.fn();
  const kill = vi.fn();
  const cancel = startRunTimer({ timeoutMs: 5000, graceMs: 2000, canInterrupt, interrupt, kill });
  return { interrupt, kill, cancel };
}

describe("startRunTimer", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("does nothing before the timeout", () => {
    const { interrupt, kill } = setup(true);
    vi.advanceTimersByTime(4999);
    expect(interrupt).not.toHaveBeenCalled();
    expect(kill).not.toHaveBeenCalled();
  });

  it("interrupts at the timeout, then kills after the grace period", () => {
    const { interrupt, kill } = setup(true);
    vi.advanceTimersByTime(5000);
    expect(interrupt).toHaveBeenCalledOnce();
    expect(kill).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2000);
    expect(kill).toHaveBeenCalledOnce();
  });

  it("does not kill if the run finishes after the interrupt", () => {
    const { interrupt, kill, cancel } = setup(true);
    vi.advanceTimersByTime(5000);
    expect(interrupt).toHaveBeenCalledOnce();
    cancel();
    vi.advanceTimersByTime(10000);
    expect(kill).not.toHaveBeenCalled();
  });

  it("kills right away at the timeout when interrupts are unavailable", () => {
    const { interrupt, kill } = setup(false);
    vi.advanceTimersByTime(5000);
    expect(interrupt).not.toHaveBeenCalled();
    expect(kill).toHaveBeenCalledOnce();
  });

  it("does nothing if cancelled before the timeout", () => {
    const { interrupt, kill, cancel } = setup(true);
    cancel();
    vi.advanceTimersByTime(10000);
    expect(interrupt).not.toHaveBeenCalled();
    expect(kill).not.toHaveBeenCalled();
  });
});
