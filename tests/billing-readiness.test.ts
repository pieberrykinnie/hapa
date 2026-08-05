import { describe, expect, it } from "vitest";
import { getBillingReadiness } from "@/lib/onboarding/billing";

describe("local billing preferences", () => {
  it("lists every requested method with concise setup guidance", () => {
    const methods = getBillingReadiness();
    expect(methods.map((item) => item.id)).toEqual(["apple_pay", "google_pay", "paypal", "affirm", "card"]);
    expect(methods.every((item) => item.status === "setup_required" && item.selectable)).toBe(true);
    expect(methods.every((item) => item.reason.length > 0 && item.reason.length < 50)).toBe(true);
    expect(new Set(methods.map((item) => item.reason)).size).toBe(methods.length);
  });

  it("never claims a local preference is an available or connected method", () => {
    expect(getBillingReadiness().some((item) => item.status === "available")).toBe(false);
  });
});
