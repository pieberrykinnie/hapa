import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { scrubEvent } from "@/lib/sentry-scrub";

describe("lib/sentry-scrub scrubEvent (FR-016, contracts/operator-error-record.md)", () => {
  const originalGroqKey = process.env.GROQ_API_KEY;

  beforeEach(() => {
    process.env.GROQ_API_KEY = "gsk_test_secret_value";
  });

  afterEach(() => {
    if (originalGroqKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = originalGroqKey;
  });

  it("strips a data: image URL", () => {
    const event = { extra: { photo: "data:image/jpeg;base64,AAAA" } };
    expect((scrubEvent(event) as { extra: { photo: string } }).extra.photo).toBe("[redacted]");
  });

  it("strips a blob: object URL", () => {
    const event = { extra: { preview: "blob:https://hapa.app/1234-5678" } };
    expect((scrubEvent(event) as { extra: { preview: string } }).extra.preview).toBe(
      "[redacted]",
    );
  });

  it("strips a value matching a known credential", () => {
    const event = { extra: { apiKey: "gsk_test_secret_value" } };
    expect((scrubEvent(event) as { extra: { apiKey: string } }).extra.apiKey).toBe("[redacted]");
  });

  it("strips a field named after a localStorage key this app uses", () => {
    const event = { extra: { "hapa.listing-visits": { p1: { openedAt: ["x"] } } } };
    expect((scrubEvent(event) as { extra: Record<string, unknown> }).extra["hapa.listing-visits"]).toBe(
      "[redacted]",
    );
  });

  it("strips the request body of a /api/vibe-photo request", () => {
    const event = {
      request: { url: "https://hapa.app/api/vibe-photo", method: "POST", data: "<multipart photo bytes>" },
    };
    expect((scrubEvent(event) as { request: { data: string } }).request.data).toBe("[redacted]");
  });

  it("passes an event with only message/stack/route/timestamp through unchanged", () => {
    const event = {
      message: "feed route threw",
      stack: "Error: boom\n  at GET (route.ts:10)",
      route: "/api/feed",
      timestamp: "2026-08-06T00:00:00.000Z",
    };
    expect(scrubEvent(event)).toEqual(event);
  });

  it("returns null for a null/undefined event", () => {
    expect(scrubEvent(null)).toBeNull();
    expect(scrubEvent(undefined)).toBeNull();
  });
});
