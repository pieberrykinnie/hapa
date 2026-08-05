import { describe, expect, it } from "vitest";
import { hasValidPhotoSignature, mayAdvanceStage, validatePhoto } from "@/lib/onboarding/rules";

describe("profile onboarding rules", () => {
  it("accepts only supported photos at or below 10 MB", () => {
    expect(validatePhoto({ type: "image/webp", size: 10 * 1024 * 1024 })).toBeNull();
    expect(validatePhoto({ type: "image/gif", size: 100 })).toMatch(/JPG/);
    expect(validatePhoto({ type: "image/jpeg", size: 10 * 1024 * 1024 + 1 })).toMatch(/10 MB/);
    expect(validatePhoto({ type: "image/png", size: 0 })).toMatch(/empty/);
  });

  it("rejects files whose bytes do not match their claimed image type", () => {
    expect(hasValidPhotoSignature("image/jpeg", new Uint8Array([0xff, 0xd8, 0xff, 0x00]))).toBe(true);
    expect(hasValidPhotoSignature("image/jpeg", new Uint8Array([0x47, 0x49, 0x46]))).toBe(false);
    expect(hasValidPhotoSignature("image/png", new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true);
    expect(hasValidPhotoSignature("image/webp", new TextEncoder().encode("RIFF1234WEBP"))).toBe(true);
  });

  it("allows only adjacent stage progress, with the documented no-photo shortcut", () => {
    expect(mayAdvanceStage("profile", "this_you")).toBe(true);
    expect(mayAdvanceStage("this_you", "billing")).toBe(true);
    expect(mayAdvanceStage("profile", "complete")).toBe(false);
    expect(mayAdvanceStage("billing", "this_you")).toBe(false);
  });
});
