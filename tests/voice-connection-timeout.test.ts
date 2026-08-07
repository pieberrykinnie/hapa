import { afterEach, describe, expect, it, vi } from "vitest";
import { CONNECT_TIMEOUT_MS, raceConnectionOutcome } from "@/lib/vapi";

type Listener = (...args: unknown[]) => void;

class FakeEventSource {
  listeners = new Map<string, Set<Listener>>();

  on(event: string, listener: Listener) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
    return this;
  }

  removeListener(event: string, listener: Listener) {
    this.listeners.get(event)?.delete(listener);
    return this;
  }

  emit(event: string) {
    this.listeners.get(event)?.forEach((listener) => listener());
  }
}

describe("lib/vapi raceConnectionOutcome (FR-013)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves \"timeout\" when no outcome event fires before CONNECT_TIMEOUT_MS", async () => {
    vi.useFakeTimers();
    const source = new FakeEventSource();
    const promise = raceConnectionOutcome(source);

    await vi.advanceTimersByTimeAsync(CONNECT_TIMEOUT_MS);

    await expect(promise).resolves.toBe("timeout");
  });

  it("resolves \"call-start\" immediately when that event fires first, without waiting out the timeout", async () => {
    vi.useFakeTimers();
    const source = new FakeEventSource();
    const promise = raceConnectionOutcome(source);

    source.emit("call-start");
    const outcome = await promise;

    expect(outcome).toBe("call-start");
    // no pending timer should still be racing after settling
    expect(vi.getTimerCount()).toBe(0);
  });

  it("resolves \"error\" when the error event fires first", async () => {
    const source = new FakeEventSource();
    const promise = raceConnectionOutcome(source, 10000);

    source.emit("error");

    await expect(promise).resolves.toBe("error");
  });
});
