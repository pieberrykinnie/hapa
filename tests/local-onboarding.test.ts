import { describe, expect, it } from "vitest";
import {
  aggregateVisualProfile,
  emptyLocalOnboarding,
  extractVisualFeatures,
  deriveShoppingConcepts,
  shoppingLabelsFromFileName,
  loadLocalOnboarding,
  parseLocalOnboarding,
  saveLocalOnboarding,
  shouldReplayOnboarding,
  suggestionsForVisualProfile,
  type LocalPhoto,
} from "@/lib/onboarding/local-store";

class MemoryStorage {
  value: string | null = null;
  getItem() { return this.value; }
  setItem(_key: string, value: string) { this.value = value; }
  removeItem() { this.value = null; }
}

function solidPhoto(id: string, red: number, green: number, blue: number): LocalPhoto {
  const pixels = new Uint8ClampedArray(4 * 4 * 4);
  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = red;
    pixels[index + 1] = green;
    pixels[index + 2] = blue;
    pixels[index + 3] = 255;
  }
  return { id, name: `${id}.jpg`, dataUrl: "data:image/jpeg;base64,test", features: extractVisualFeatures(pixels, 4, 4) };
}

describe("device-local onboarding", () => {
  it("starts clean when storage is absent or corrupt", () => {
    const storage = new MemoryStorage();
    expect(loadLocalOnboarding(storage).stage).toBe("profile");
    storage.value = "not-json";
    expect(loadLocalOnboarding(storage).stage).toBe("profile");
  });

  it("recognizes only the explicit onboarding replay query", () => {
    expect(shouldReplayOnboarding("?onboarding=1")).toBe(true);
    expect(shouldReplayOnboarding("?onboarding=0")).toBe(false);
    expect(shouldReplayOnboarding("?other=1")).toBe(false);
  });

  it("round-trips a versioned local profile", () => {
    const storage = new MemoryStorage();
    const state = emptyLocalOnboarding("2026-08-05T00:00:00.000Z");
    state.displayName = "Ada";
    state.stage = "this_you";
    saveLocalOnboarding(state, storage);
    expect(loadLocalOnboarding(storage)).toMatchObject({ version: 2, displayName: "Ada", stage: "this_you" });
  });

  it("repairs an impossible completed stage", () => {
    const broken = { ...emptyLocalOnboarding(), displayName: "Ada", stage: "complete" as const };
    expect(parseLocalOnboarding(broken).stage).toBe("this_you");
  });

  it("extracts different visual signals from warm and cool pixels", () => {
    const warm = solidPhoto("warm", 220, 125, 55).features;
    const cool = solidPhoto("cool", 45, 120, 215).features;
    expect(warm.warmth).toBeGreaterThan(.5);
    expect(cool.warmth).toBeLessThan(-.5);
    expect(warm.palette[0]).not.toBe(cool.palette[0]);
  });

  it("normalizes model labels into non-sensitive shopping concepts", () => {
    expect(deriveShoppingConcepts([
      { label: "jean, blue jean, denim", score: .91 },
      { label: "running shoe", score: .72 },
      { label: "person", score: .68 },
    ])).toEqual(["denim", "sneakers"]);
  });

  it("uses the strongest zero-shot shopping label even when confidence is spread out", () => {
    expect(deriveShoppingConcepts([
      { label: "denim jeans and denim clothing", score: .11 },
      { label: "furniture, lighting, and home decor", score: .105 },
      { label: "fashion accessories", score: .08 },
    ])).toEqual(["denim"]);
  });

  it("fakes prototype personalization from the image filename", () => {
    expect(shoppingLabelsFromFileName("favorite-wide-leg-jeans.png")).toEqual([
      { label: "denim jeans", score: 1 },
    ]);
    expect(shoppingLabelsFromFileName("Screenshot 2026-08-05.png")).toEqual([
      { label: "denim jeans", score: 1 },
    ]);
  });

  it("replaces previously saved color cards from a denim filename on reload", () => {
    const photo = solidPhoto("old-photo", 45, 90, 145);
    photo.name = "saved-denim-jeans.jpg";
    const restored = parseLocalOnboarding({
      ...emptyLocalOnboarding(),
      displayName: "Ada",
      stage: "this_you",
      photos: [photo],
    });
    expect(restored.suggestions.every((item) => item.category.includes("denim"))).toBe(true);
  });

  it("aggregates every uploaded image into one visual profile", () => {
    const warm = solidPhoto("warm", 220, 125, 55);
    const cool = solidPhoto("cool", 45, 120, 215);
    const profile = aggregateVisualProfile([warm, cool]);
    expect(profile).toMatchObject({ imageCount: 2 });
    expect(profile?.palette.length).toBeGreaterThan(1);
    expect(Math.abs(profile?.warmth ?? 1)).toBeLessThan(.2);
  });

  it("uses exactly five generic suggestions when filenames have no recognized keyword", () => {
    const warmProfile = aggregateVisualProfile([solidPhoto("warm", 220, 125, 55)]);
    const coolProfile = aggregateVisualProfile([solidPhoto("cool", 45, 120, 215)]);
    const generic = suggestionsForVisualProfile(null);
    const warm = suggestionsForVisualProfile(warmProfile);
    const cool = suggestionsForVisualProfile(coolProfile);

    expect(generic).toHaveLength(5);
    expect(warm).toHaveLength(5);
    expect(new Set(warm.map((item) => item.category)).size).toBe(5);
    expect(warm.every((item) => item.source === "generic")).toBe(true);
    expect(warm.map((item) => item.id)).toEqual(cool.map((item) => item.id));
  });

  it("turns a jeans classification into five concrete denim directions with imagery", () => {
    const denimPhoto = solidPhoto("jeans", 45, 90, 145);
    denimPhoto.labels = [{ label: "jean, blue jean, denim", score: .94 }];
    const suggestions = suggestionsForVisualProfile(aggregateVisualProfile([denimPhoto]));
    expect(suggestions).toHaveLength(5);
    expect(suggestions.every((item) => item.category.includes("denim"))).toBe(true);
    expect(suggestions.every((item) => item.imageUrl?.startsWith("/onboarding/denim/") && item.imageUrl.endsWith(".webp"))).toBe(true);
    expect(suggestions.map((item) => item.title)).toContain("Relaxed everyday denim");
  });

  it("balances jeans and shirts across the five-card deck", () => {
    const jeans = solidPhoto("jeans", 45, 90, 145);
    jeans.name = "favorite-jeans.jpg";
    jeans.labels = shoppingLabelsFromFileName(jeans.name);
    const shirts = solidPhoto("shirts", 220, 220, 215);
    shirts.name = "shirts.png";
    shirts.labels = shoppingLabelsFromFileName(shirts.name);
    const suggestions = suggestionsForVisualProfile(aggregateVisualProfile([jeans, shirts]));
    expect(suggestions).toHaveLength(5);
    expect(suggestions.filter((item) => item.category.startsWith("denim")).length).toBe(3);
    expect(suggestions.filter((item) => item.category.startsWith("shirts")).length).toBe(2);
  });

  it("migrates the previous single-photo record without losing the name", () => {
    const migrated = parseLocalOnboarding({
      version: 1,
      displayName: "Ada",
      photo: { name: "old.jpg", dataUrl: "data:image/jpeg;base64,test", tone: "warm" },
    });
    expect(migrated).toMatchObject({ version: 2, displayName: "Ada", stage: "this_you" });
    expect(migrated.photos).toHaveLength(1);
    expect(migrated.visualProfile?.descriptors).toContain("warm color");
  });
});
