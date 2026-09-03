// Telegram polling session: poll stall-threshold config coercion.
import { describe, expect, it } from "vitest";
import {
  DEFAULT_POLL_STALL_THRESHOLD_MS,
  MAX_POLL_STALL_THRESHOLD_MS,
  MIN_POLL_STALL_THRESHOLD_MS,
  resolvePollingStallThresholdMs,
} from "./polling-session.js";

describe("resolvePollingStallThresholdMs", () => {
  it("falls back to the documented default when the configured value is zero", () => {
    expect(resolvePollingStallThresholdMs(0)).toBe(DEFAULT_POLL_STALL_THRESHOLD_MS);
  });

  it("falls back to the documented default when the configured value is negative", () => {
    expect(resolvePollingStallThresholdMs(-5_000)).toBe(DEFAULT_POLL_STALL_THRESHOLD_MS);
  });

  it("falls back to the documented default when the configured value is non-finite", () => {
    expect(resolvePollingStallThresholdMs(Number.NaN)).toBe(DEFAULT_POLL_STALL_THRESHOLD_MS);
    expect(resolvePollingStallThresholdMs(Number.POSITIVE_INFINITY)).toBe(
      DEFAULT_POLL_STALL_THRESHOLD_MS,
    );
    expect(resolvePollingStallThresholdMs(Number.NEGATIVE_INFINITY)).toBe(
      DEFAULT_POLL_STALL_THRESHOLD_MS,
    );
  });

  it("falls back to the documented default when no value is configured", () => {
    expect(resolvePollingStallThresholdMs(undefined)).toBe(DEFAULT_POLL_STALL_THRESHOLD_MS);
  });

  it("does not collapse an invalid value to the MIN clamp, disabling/corrupting the watchdog", () => {
    // Before the fix, a zero/negative configured value fell through the MIN/MAX
    // clamp unchanged, silently becoming MIN_POLL_STALL_THRESHOLD_MS (a far more
    // aggressive watchdog than configured) instead of the documented default.
    const threshold = resolvePollingStallThresholdMs(0);
    expect(threshold).not.toBe(MIN_POLL_STALL_THRESHOLD_MS);
    expect(threshold).toBe(DEFAULT_POLL_STALL_THRESHOLD_MS);
  });

  it("honors a positive configured value within the MIN/MAX bounds", () => {
    expect(resolvePollingStallThresholdMs(180_000)).toBe(180_000);
  });

  it("clamps a positive configured value below MIN up to MIN_POLL_STALL_THRESHOLD_MS", () => {
    expect(resolvePollingStallThresholdMs(1_000)).toBe(MIN_POLL_STALL_THRESHOLD_MS);
  });

  it("clamps a positive configured value above MAX down to MAX_POLL_STALL_THRESHOLD_MS", () => {
    expect(resolvePollingStallThresholdMs(10_000_000)).toBe(MAX_POLL_STALL_THRESHOLD_MS);
  });
});
