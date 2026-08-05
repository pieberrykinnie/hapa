import type {
  ConfirmedStyleProfile,
  OnboardingStage,
  StyleSuggestion,
  SuggestionDecision,
} from "@/lib/types";
import {
  ACCEPTED_PHOTO_TYPES,
  GENERIC_SUGGESTIONS,
  MAX_PHOTO_BYTES,
} from "./constants";

const SENSITIVE_PATTERNS = [
  /\b(race|ethnicity|religion|disability|sexuality|pregnan(?:t|cy)|biometric(?:s)?)\b/i,
  /\b(gender identity|face recognition|medical condition|health condition)\b/i,
  /\b(person(?:'s)? age|years? old|identify (?:the )?person|person(?:'s)? name)\b/i,
];

export function validatePhoto(file: Pick<File, "type" | "size">): string | null {
  if (!ACCEPTED_PHOTO_TYPES.includes(file.type as (typeof ACCEPTED_PHOTO_TYPES)[number])) {
    return "Choose a JPG, PNG, or WebP image.";
  }
  if (file.size <= 0) return "That image is empty or unreadable.";
  if (file.size > MAX_PHOTO_BYTES) return "Choose an image smaller than 10 MB.";
  return null;
}

export function hasValidPhotoSignature(type: string, bytes: Uint8Array): boolean {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value);
  if (type === "image/webp") {
    return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  }
  return false;
}

export function normalizeToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function safeSuggestions(input: unknown): StyleSuggestion[] | null {
  if (!Array.isArray(input) || input.length !== 5) return null;
  const seen = new Set<string>();
  const result: StyleSuggestion[] = [];

  for (let position = 0; position < input.length; position += 1) {
    const raw = input[position] as Record<string, unknown>;
    const category = normalizeToken(String(raw.category ?? ""));
    const title = String(raw.title ?? "").trim().slice(0, 80);
    const description = String(raw.description ?? "").trim().slice(0, 180);
    const positives = normalizeList(raw.positiveAttributes);
    const rejections = normalizeList(raw.rejectionAttributes);
    const prose = `${category} ${title} ${description} ${positives.join(" ")} ${rejections.join(" ")}`.toLowerCase();
    if (
      !category ||
      !title ||
      !description ||
      positives.length === 0 ||
      rejections.length === 0 ||
      seen.has(category) ||
      SENSITIVE_PATTERNS.some((pattern) => pattern.test(prose))
    ) return null;

    seen.add(category);
    result.push({
      id: `generated-${position}-${category}`,
      position,
      category,
      title,
      description,
      positiveAttributes: positives,
      rejectionAttributes: rejections,
      imageKey: normalizeToken(String(raw.imageKey ?? category)) || category,
      source: "photo",
    });
  }
  return result;
}

function normalizeList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => normalizeToken(String(item))).filter(Boolean))).slice(0, 5);
}

export function genericSuggestions(): StyleSuggestion[] {
  return GENERIC_SUGGESTIONS.map((item) => ({ ...item, positiveAttributes: [...item.positiveAttributes], rejectionAttributes: [...item.rejectionAttributes] }));
}

export function buildStyleProfile(
  decisions: Array<{ suggestion: StyleSuggestion; decision: SuggestionDecision }>,
  now = new Date().toISOString(),
): ConfirmedStyleProfile {
  const categories = new Set<string>();
  const positives: Record<string, number> = {};
  const exclusions = new Set<string>();

  for (const { suggestion, decision } of decisions) {
    if (decision === "accept") {
      categories.add(suggestion.category);
      for (const attribute of suggestion.positiveAttributes) {
        positives[attribute] = Math.min(5, (positives[attribute] ?? 0) + 1);
      }
    } else {
      for (const attribute of suggestion.rejectionAttributes) exclusions.add(attribute);
    }
  }
  for (const exclusion of exclusions) delete positives[exclusion];

  return {
    activeCategories: [...categories],
    positiveAttributes: positives,
    exclusions: [...exclusions],
    context: null,
    priceCeiling: null,
    version: 2,
    updatedAt: now,
  };
}

const STAGE_ORDER: OnboardingStage[] = [
  "profile",
  "photo_processing",
  "this_you",
  "billing",
  "complete",
];

export function mayAdvanceStage(current: OnboardingStage, next: OnboardingStage): boolean {
  if (current === next) return true;
  if (current === "profile" && next === "this_you") return true;
  return STAGE_ORDER.indexOf(next) === STAGE_ORDER.indexOf(current) + 1;
}
