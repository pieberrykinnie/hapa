import { describe, expect, it } from "vitest";
import { buildStyleProfile, genericSuggestions, safeSuggestions } from "@/lib/onboarding/rules";

describe("suggestion contracts", () => {
  it("always returns a fresh generic set of exactly five varied cards", () => {
    const first = genericSuggestions();
    const second = genericSuggestions();
    expect(first).toHaveLength(5);
    expect(new Set(first.map((item) => item.category)).size).toBe(5);
    first[0].positiveAttributes.push("changed");
    expect(second[0].positiveAttributes).not.toContain("changed");
  });

  it("accepts a safe exact-five provider payload", () => {
    const input = genericSuggestions().map((item) => ({ ...item, source: undefined }));
    expect(safeSuggestions(input)).toHaveLength(5);
  });

  it("rejects incomplete, duplicate, and sensitive-trait provider output", () => {
    expect(safeSuggestions(genericSuggestions().slice(0, 4))).toBeNull();
    const duplicate = genericSuggestions(); duplicate[1].category = duplicate[0].category;
    expect(safeSuggestions(duplicate)).toBeNull();
    const unsafe = genericSuggestions(); unsafe[0].description = "Recommended for a person's ethnicity";
    expect(safeSuggestions(unsafe)).toBeNull();
  });

  it("keeps explicit decisions separate and lets exclusions win", () => {
    const suggestions = genericSuggestions();
    suggestions[0].positiveAttributes = ["minimal", "layered"];
    suggestions[1].rejectionAttributes = ["minimal"];
    const result = buildStyleProfile([
      { suggestion: suggestions[0], decision: "accept" },
      { suggestion: suggestions[1], decision: "reject" },
    ], "2026-08-05T00:00:00.000Z");
    expect(result.activeCategories).toEqual([suggestions[0].category]);
    expect(result.positiveAttributes.minimal).toBeUndefined();
    expect(result.positiveAttributes.layered).toBe(1);
    expect(result.exclusions).toContain("minimal");
    expect(result.version).toBe(2);
  });
});
