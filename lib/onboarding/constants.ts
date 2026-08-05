import type { StyleSuggestion } from "@/lib/types";

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_PHOTO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const GENERIC_SUGGESTIONS: StyleSuggestion[] = [
  {
    id: "generic-streetwear",
    position: 0,
    category: "streetwear",
    title: "Streetwear rotation",
    description: "Relaxed layers, standout sneakers, and everyday utility.",
    positiveAttributes: ["relaxed", "layered", "streetwear"],
    rejectionAttributes: ["streetwear", "oversized"],
    imageKey: "streetwear",
    source: "generic",
  },
  {
    id: "generic-minimal-home",
    position: 1,
    category: "home",
    title: "Clean space energy",
    description: "Quiet forms, useful objects, and a warm minimal palette.",
    positiveAttributes: ["minimal", "warm-neutral", "functional"],
    rejectionAttributes: ["minimal", "neutral"],
    imageKey: "minimal-home",
    source: "generic",
  },
  {
    id: "generic-color-pop",
    position: 2,
    category: "accessories",
    title: "A sharp color pop",
    description: "Playful accessories with one unapologetic focal color.",
    positiveAttributes: ["colorful", "playful", "statement"],
    rejectionAttributes: ["bright-color", "statement"],
    imageKey: "color-pop",
    source: "generic",
  },
  {
    id: "generic-vintage",
    position: 3,
    category: "vintage",
    title: "Vintage leather & brass",
    description: "Patina, natural materials, and objects made to age well.",
    positiveAttributes: ["vintage", "leather", "earth-tone"],
    rejectionAttributes: ["vintage", "leather"],
    imageKey: "vintage",
    source: "generic",
  },
  {
    id: "generic-outdoors",
    position: 4,
    category: "outdoors",
    title: "Dirt-road weekends",
    description: "Durable gear, trail-ready layers, and campsite comforts.",
    positiveAttributes: ["outdoor", "durable", "earth-tone"],
    rejectionAttributes: ["outdoor", "rugged"],
    imageKey: "outdoors",
    source: "generic",
  },
];

export const PRIVACY_NOTICE =
  "Suggestions use broad shopping signals like colors, materials, silhouettes, and objects — never identity or sensitive traits.";
