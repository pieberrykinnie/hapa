import { describe, expect, it } from "vitest";
import { isValidListingUrl, recordVisit } from "@/lib/listing-visits";
import type { Product } from "@/lib/types";

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    title: "Tent",
    price: 100,
    currency: "CAD",
    salePct: null,
    merchant: "Acme Outdoors",
    image: "",
    gallery: [],
    link: "https://example.com/tent",
    tags: [],
    description: "",
    galleryToken: null,
    ...overrides,
  };
}

describe("lib/listing-visits", () => {
  it("creates a one-entry record on first visit", () => {
    const next = recordVisit({}, product(), "2026-08-06T00:00:00.000Z");
    expect(next.p1).toEqual({
      productId: "p1",
      merchant: "Acme Outdoors",
      listingUrl: "https://example.com/tent",
      openedAt: ["2026-08-06T00:00:00.000Z"],
    });
  });

  it("appends a second timestamp without losing the first", () => {
    const first = recordVisit({}, product(), "2026-08-06T00:00:00.000Z");
    const second = recordVisit(first, product(), "2026-08-06T01:00:00.000Z");
    expect(second.p1.openedAt).toEqual([
      "2026-08-06T00:00:00.000Z",
      "2026-08-06T01:00:00.000Z",
    ]);
  });

  it("accepts a well-formed https URL", () => {
    expect(isValidListingUrl("https://example.com/item")).toBe(true);
  });

  it("rejects empty, null, and malformed URLs", () => {
    expect(isValidListingUrl("")).toBe(false);
    expect(isValidListingUrl(null)).toBe(false);
    expect(isValidListingUrl("not a url")).toBe(false);
  });
});
