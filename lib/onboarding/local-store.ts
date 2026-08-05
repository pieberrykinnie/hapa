import type {
  ConfirmedStyleProfile,
  PaymentMethodId,
  StyleSuggestion,
  SuggestionDecision,
} from "@/lib/types";
import { genericSuggestions, hasValidPhotoSignature, validatePhoto } from "./rules";

export interface SemanticLabel {
  label: string;
  score: number;
}

export const LOCAL_ONBOARDING_KEY = "hapa.onboarding.v1";
export const MAX_LOCAL_PHOTOS = 5;
export type LocalStage = "profile" | "this_you" | "billing" | "complete";

export interface VisualFeatures {
  palette: string[];
  saturation: number;
  luminance: number;
  contrast: number;
  warmth: number;
  edgeDensity: number;
  colorDiversity: number;
}

export interface VisualProfile extends VisualFeatures {
  imageCount: number;
  descriptors: string[];
  labels: SemanticLabel[];
  concepts: string[];
}

export interface LocalPhoto {
  id: string;
  dataUrl: string;
  name: string;
  features: VisualFeatures;
  labels?: SemanticLabel[];
}

export interface LocalOnboardingState {
  version: 2;
  stage: LocalStage;
  displayName: string;
  photos: LocalPhoto[];
  visualProfile: VisualProfile | null;
  suggestions: StyleSuggestion[];
  decisions: Record<string, SuggestionDecision>;
  styleProfile: ConfirmedStyleProfile | null;
  preferredPaymentMethod: PaymentMethodId | null;
  billingDeferred: boolean;
  updatedAt: string;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface SuggestionCandidate {
  id: string;
  concept?: string;
  category: string;
  title: string;
  description: string;
  positive: string[];
  reject: string[];
  imageUrl?: string;
  imageCredit?: string;
  score: (profile: VisualProfile) => number;
}

const CANDIDATES: SuggestionCandidate[] = [
  { id: "denim-relaxed", concept: "denim", category: "denim-relaxed", title: "Relaxed everyday denim", description: "Easy straight and loose fits with lived-in blue washes.", positive: ["denim", "relaxed-fit", "everyday"], reject: ["loose-fit", "blue-denim"], imageUrl: "/onboarding/denim/relaxed.webp", imageCredit: "Alicia Petresc · Unsplash", score: (p) => semanticBoost(p, "denim") + (1 - p.contrast) + .6 },
  { id: "denim-clean", concept: "denim", category: "denim-straight", title: "Clean straight-leg staples", description: "Crisp straight cuts, simple tees, and unfussy proportions.", positive: ["denim", "straight-leg", "clean"], reject: ["straight-leg", "minimal-denim"], imageUrl: "/onboarding/denim/straight.webp", imageCredit: "Ashkan Forouzani · Unsplash", score: (p) => semanticBoost(p, "denim") + (1 - p.edgeDensity) + .5 },
  { id: "denim-faded", concept: "denim", category: "denim-vintage", title: "Faded vintage washes", description: "Broken-in blues, visible character, and thrifted texture.", positive: ["denim", "vintage-wash", "faded"], reject: ["distressed-denim", "vintage-wash"], imageUrl: "/onboarding/denim/vintage.webp", imageCredit: "Markus Spiske · Unsplash", score: (p) => semanticBoost(p, "denim") + p.edgeDensity + (1 - p.luminance) * .4 },
  { id: "denim-street", concept: "denim", category: "denim-streetwear", title: "Denim with sneaker energy", description: "Roomier jeans, sharp sneakers, and street-ready layers.", positive: ["denim", "streetwear", "sneakers"], reject: ["baggy-denim", "streetwear"], imageUrl: "/onboarding/denim/street.webp", imageCredit: "Creaslim · Unsplash", score: (p) => semanticBoost(p, "denim") + p.contrast + .3 },
  { id: "denim-workwear", concept: "denim", category: "denim-workwear", title: "Rugged denim layers", description: "Heavier indigo, workwear details, and durable overshirts.", positive: ["denim", "workwear", "rugged"], reject: ["heavy-denim", "workwear"], imageUrl: "/onboarding/denim/workwear.webp", imageCredit: "Sincerely Media · Unsplash", score: (p) => semanticBoost(p, "denim") + p.edgeDensity * .8 + p.contrast * .4 },
  { id: "shirts-white", concept: "tops", category: "shirts-crisp", title: "Crisp white shirts", description: "Clean button-downs with sharp collars and easy structure.", positive: ["shirts", "crisp", "button-down"], reject: ["formal-shirt", "stiff-collar"], imageUrl: "/onboarding/shirts/crisp-white.webp", imageCredit: "Lumin · Unsplash", score: (p) => semanticBoost(p, "tops") + (1 - p.saturation) + .6 },
  { id: "shirts-relaxed", concept: "tops", category: "shirts-relaxed", title: "Relaxed everyday shirts", description: "Soft proportions, open collars, and effortless daily layers.", positive: ["shirts", "relaxed", "everyday"], reject: ["oversized-shirt", "open-collar"], imageUrl: "/onboarding/shirts/everyday-button.webp", imageCredit: "Nimble Made · Unsplash", score: (p) => semanticBoost(p, "tops") + (1 - p.contrast) + .5 },
  { id: "shirts-dark", concept: "tops", category: "shirts-tailored", title: "Dark tailored shirts", description: "Polished dark shirts with a cleaner, evening-ready line.", positive: ["shirts", "dark", "tailored"], reject: ["dark-shirt", "formal"], imageUrl: "/onboarding/shirts/dark-tailored.webp", imageCredit: "Hunters Race · Unsplash", score: (p) => semanticBoost(p, "tops") + p.contrast + .4 },
  { id: "shirts-overshirt", concept: "tops", category: "shirts-overshirts", title: "Layer-ready overshirts", description: "Substantial shirts worn open over tees and simple basics.", positive: ["shirts", "layered", "overshirt"], reject: ["heavy-shirt", "layering"], imageUrl: "/onboarding/shirts/everyday-button.webp", imageCredit: "Nimble Made · Unsplash", score: (p) => semanticBoost(p, "tops") + p.edgeDensity + .3 },
  { id: "shirts-minimal", concept: "tops", category: "shirts-minimal", title: "Quiet shirt essentials", description: "Low-noise colors, dependable cuts, and versatile styling.", positive: ["shirts", "minimal", "versatile"], reject: ["plain-shirt", "minimal"], imageUrl: "/onboarding/shirts/crisp-white.webp", imageCredit: "Lumin · Unsplash", score: (p) => semanticBoost(p, "tops") + (1 - p.colorDiversity) + .2 },
  { id: "warm-organic", category: "organic-home", title: "Warm, organic forms", description: "Natural materials, softened shapes, and lived-in neutrals.", positive: ["organic", "warm", "natural-material"], reject: ["organic", "earth-tone"], score: (p) => p.warmth * 2 + p.edgeDensity + (1 - p.saturation) * .45 },
  { id: "cool-minimal", category: "modern-minimal", title: "Cool, quiet minimalism", description: "Clean geometry, useful objects, and cool restrained color.", positive: ["minimal", "cool-tone", "clean-lined"], reject: ["minimal", "cool-tone"], score: (p) => -p.warmth * 2 + (1 - p.edgeDensity) + (1 - p.colorDiversity) * .7 },
  { id: "bold-color", category: "color-pop", title: "One strong color move", description: "Focused statement color balanced by simpler supporting pieces.", positive: ["colorful", "statement", "focused"], reject: ["bright-color", "statement"], score: (p) => p.saturation * 1.7 + p.contrast + p.colorDiversity * .7 },
  { id: "monochrome", category: "monochrome", title: "Tonal and monochrome", description: "Layered shades, subtle material changes, and low-noise styling.", positive: ["tonal", "monochrome", "subtle"], reject: ["monochrome", "low-saturation"], score: (p) => (1 - p.saturation) * 1.8 + p.contrast * .45 + (1 - p.colorDiversity) },
  { id: "vintage-crafted", category: "vintage", title: "Vintage, made-to-last", description: "Patina, tactile finishes, and pieces with visible character.", positive: ["vintage", "crafted", "textured"], reject: ["vintage", "patina"], score: (p) => p.warmth * 1.2 + p.edgeDensity * 1.4 + (1 - p.luminance) * .35 },
  { id: "street-layers", category: "streetwear", title: "Graphic street layers", description: "Contrast, relaxed proportions, and visually structured layers.", positive: ["streetwear", "layered", "graphic"], reject: ["streetwear", "oversized"], score: (p) => p.contrast * 1.5 + p.edgeDensity + (1 - p.luminance) * .55 },
  { id: "soft-cozy", category: "soft-home", title: "Soft, easy comfort", description: "Gentle contrast, comfortable texture, and calm familiar color.", positive: ["soft", "cozy", "low-contrast"], reject: ["soft", "cozy"], score: (p) => (1 - p.contrast) * 1.6 + p.warmth * .7 + (1 - p.saturation) * .5 },
  { id: "polished-classic", category: "classic", title: "Polished classics", description: "Balanced color, crisp finish, and dependable silhouettes.", positive: ["classic", "polished", "balanced"], reject: ["classic", "formal"], score: (p) => (1 - Math.abs(p.saturation - .42)) + p.contrast * .7 + (1 - p.colorDiversity) * .5 },
  { id: "outdoor-utility", category: "outdoors", title: "Outdoor utility", description: "Durable texture, grounded colors, and function-first details.", positive: ["outdoor", "durable", "utility"], reject: ["outdoor", "rugged"], score: (p) => p.edgeDensity * 1.25 + p.warmth * .65 + (1 - Math.abs(p.saturation - .4)) * .6 },
  { id: "modern-tech", category: "tech", title: "Clean modern tech", description: "Precise surfaces, cool color, and low-clutter functionality.", positive: ["tech", "precise", "functional"], reject: ["tech", "sleek"], score: (p) => -p.warmth * 1.25 + (1 - p.edgeDensity) + p.contrast * .75 },
  { id: "artful-eclectic", category: "eclectic", title: "Artful and collected", description: "A varied palette, tactile contrast, and unexpected combinations.", positive: ["eclectic", "artful", "mixed-material"], reject: ["eclectic", "maximal"], score: (p) => p.colorDiversity * 1.6 + p.saturation + p.edgeDensity * .7 },
  { id: "sculptural-neutral", category: "sculptural", title: "Sculptural neutrals", description: "Restrained color with strong shape, shadow, and negative space.", positive: ["sculptural", "neutral", "architectural"], reject: ["neutral", "architectural"], score: (p) => (1 - p.saturation) * 1.25 + p.contrast + (1 - p.edgeDensity) * .55 },
];

export function emptyLocalOnboarding(now = new Date().toISOString()): LocalOnboardingState {
  return {
    version: 2,
    stage: "profile",
    displayName: "",
    photos: [],
    visualProfile: null,
    suggestions: suggestionsForVisualProfile(null),
    decisions: {},
    styleProfile: null,
    preferredPaymentMethod: null,
    billingDeferred: false,
    updatedAt: now,
  };
}

export function loadLocalOnboarding(storage: StorageLike = window.localStorage): LocalOnboardingState {
  try {
    const raw = storage.getItem(LOCAL_ONBOARDING_KEY);
    if (!raw) return emptyLocalOnboarding();
    return parseLocalOnboarding(JSON.parse(raw));
  } catch {
    return emptyLocalOnboarding();
  }
}

export function parseLocalOnboarding(input: unknown): LocalOnboardingState {
  const clean = emptyLocalOnboarding();
  if (!input || typeof input !== "object") return clean;
  const value = input as Record<string, unknown>;
  if (value.version === 1) return migrateVersionOne(value);
  if (value.version !== 2) return clean;

  const displayName = typeof value.displayName === "string" ? value.displayName.trim().slice(0, 80) : "";
  const photos = Array.isArray(value.photos)
    ? value.photos.filter(isLocalPhoto).slice(0, MAX_LOCAL_PHOTOS).map((photo) => ({
        ...photo,
        labels: shoppingLabelsFromFileName(photo.name),
      }))
    : [];
  const visualProfile = photos.length ? aggregateVisualProfile(photos) : null;
  const suggestions = suggestionsForVisualProfile(visualProfile);
  const ids = new Set(suggestions.map((item) => item.id));
  const decisions = Object.fromEntries(
    Object.entries((value.decisions as Record<string, unknown>) ?? {}).filter(
      ([id, decision]) => ids.has(id) && (decision === "accept" || decision === "reject"),
    ),
  ) as Record<string, SuggestionDecision>;
  const styleProfile = isStyleProfile(value.styleProfile) ? value.styleProfile : null;
  const completedDecisions = suggestions.every((item) => decisions[item.id]);
  const requestedStage = isStage(value.stage) ? value.stage : "profile";
  const stage = (requestedStage === "billing" || requestedStage === "complete") && (!completedDecisions || !styleProfile)
    ? "this_you"
    : requestedStage;

  return {
    ...clean,
    stage: displayName ? stage : "profile",
    displayName,
    photos,
    visualProfile,
    suggestions,
    decisions,
    styleProfile,
    preferredPaymentMethod: isPaymentMethod(value.preferredPaymentMethod) ? value.preferredPaymentMethod : null,
    billingDeferred: Boolean(value.billingDeferred),
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : clean.updatedAt,
  };
}

export function saveLocalOnboarding(state: LocalOnboardingState, storage: StorageLike = window.localStorage): LocalOnboardingState {
  const next = { ...state, updatedAt: new Date().toISOString() };
  try {
    storage.setItem(LOCAL_ONBOARDING_KEY, JSON.stringify(next));
  } catch {
    throw new Error("This browser could not save your profile. Remove an image or free some site storage, then try again.");
  }
  return next;
}

export function resetLocalOnboarding(storage: StorageLike = window.localStorage) {
  storage.removeItem(LOCAL_ONBOARDING_KEY);
}

export function shouldReplayOnboarding(search: string): boolean {
  return new URLSearchParams(search).get("onboarding") === "1";
}

export async function prepareLocalPhoto(file: File): Promise<LocalPhoto> {
  const validation = validatePhoto(file);
  if (validation) throw new Error(validation);
  const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!hasValidPhotoSignature(file.type, signature)) throw new Error("That file does not contain a valid image matching its type.");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("That image could not be opened. Choose another JPG, PNG, or WebP file.");
  }
  const maxEdge = 560;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("This browser cannot prepare the selected image.");
  }
  context.fillStyle = "#faf7f2";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", .74);
  const labels = shoppingLabelsFromFileName(file.name);
  return {
    id: `${file.name}-${file.size}-${file.lastModified}`,
    dataUrl,
    name: file.name,
    features: neutralVisualFeatures(),
    labels,
  };
}

export function extractVisualFeatures(pixels: ArrayLike<number>, width: number, height: number): VisualFeatures {
  const buckets = new Map<string, number>();
  let saturationTotal = 0;
  let luminanceTotal = 0;
  let luminanceSquared = 0;
  let warmthTotal = 0;
  let samples = 0;
  const luminanceGrid: number[] = [];
  const pixelStep = Math.max(1, Math.floor(Math.sqrt((width * height) / 18000)));

  for (let y = 0; y < height; y += pixelStep) {
    for (let x = 0; x < width; x += pixelStep) {
      const index = (y * width + x) * 4;
      const red = Number(pixels[index] ?? 0);
      const green = Number(pixels[index + 1] ?? 0);
      const blue = Number(pixels[index + 2] ?? 0);
      const max = Math.max(red, green, blue);
      const min = Math.min(red, green, blue);
      const saturation = max === 0 ? 0 : (max - min) / max;
      const luminance = (red * .2126 + green * .7152 + blue * .0722) / 255;
      saturationTotal += saturation;
      luminanceTotal += luminance;
      luminanceSquared += luminance * luminance;
      warmthTotal += (red - blue) / 255;
      luminanceGrid.push(luminance);
      const key = `${red >> 5}-${green >> 5}-${blue >> 5}`;
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
      samples += 1;
    }
  }

  const columns = Math.ceil(width / pixelStep);
  let edgeTotal = 0;
  let edgeSamples = 0;
  for (let index = 0; index < luminanceGrid.length; index += 1) {
    if ((index + 1) % columns !== 0 && index + 1 < luminanceGrid.length) {
      edgeTotal += Math.abs(luminanceGrid[index] - luminanceGrid[index + 1]);
      edgeSamples += 1;
    }
    if (index + columns < luminanceGrid.length) {
      edgeTotal += Math.abs(luminanceGrid[index] - luminanceGrid[index + columns]);
      edgeSamples += 1;
    }
  }

  const luminance = samples ? luminanceTotal / samples : .5;
  const variance = samples ? Math.max(0, luminanceSquared / samples - luminance * luminance) : 0;
  const significantBuckets = [...buckets.values()].filter((count) => count / Math.max(1, samples) >= .004).length;
  const palette = [...buckets.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([key]) => bucketToHex(key));
  return {
    palette: palette.length ? palette : ["#d8d2c6", "#6f7c70", "#2f332f"],
    saturation: clamp(samples ? saturationTotal / samples : 0),
    luminance: clamp(luminance),
    contrast: clamp(Math.sqrt(variance) * 2.5),
    warmth: clampSigned(samples ? warmthTotal / samples * 2 : 0),
    edgeDensity: clamp(edgeSamples ? edgeTotal / edgeSamples * 4 : 0),
    colorDiversity: clamp(significantBuckets / 36),
  };
}

export function aggregateVisualProfile(photos: LocalPhoto[]): VisualProfile | null {
  if (!photos.length) return null;
  const average = (field: keyof Omit<VisualFeatures, "palette">) =>
    photos.reduce((sum, photo) => sum + photo.features[field], 0) / photos.length;
  const palette = Array.from(new Set(photos.flatMap((photo) => photo.features.palette.slice(0, 3)))).slice(0, 6);
  const labelScores = new Map<string, number>();
  for (const label of photos.flatMap((photo) => photo.labels ?? []).filter(isSemanticLabel)) {
    labelScores.set(label.label, (labelScores.get(label.label) ?? 0) + label.score);
  }
  const labels = [...labelScores.entries()]
    .map(([label, score]) => ({ label, score: score / photos.length }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
  const profile: VisualProfile = {
    imageCount: photos.length,
    palette,
    saturation: average("saturation"),
    luminance: average("luminance"),
    contrast: average("contrast"),
    warmth: average("warmth"),
    edgeDensity: average("edgeDensity"),
    colorDiversity: average("colorDiversity"),
    descriptors: [],
    labels,
    concepts: deriveShoppingConcepts(labels),
  };
  profile.descriptors = describeVisualProfile(profile);
  return profile;
}

export function suggestionsForVisualProfile(profile: VisualProfile | null): StyleSuggestion[] {
  if (!profile || profile.concepts.length === 0) {
    return genericSuggestions().map((item, position) => ({
      ...item,
      position,
      reason: "Part of a varied starter mix",
      palette: ["#d9d1c4", "#758579", "#343a35"],
    }));
  }
  const reason = profile.concepts.length
    ? `Recognized ${profile.concepts.slice(0, 2).join(" + ")} · ${profile.descriptors.slice(0, 2).join(" · ")}`
    : `Picked from ${profile.descriptors.slice(0, 3).join(", ")}`;
  return balancedCandidates(profile)
    .map((candidate, position) => ({
      id: `visual-${candidate.id}`,
      position,
      category: candidate.category,
      title: candidate.title,
      description: candidate.description,
      positiveAttributes: candidate.positive,
      rejectionAttributes: candidate.reject,
      imageKey: candidate.id,
      source: "photo" as const,
      reason,
      palette: profile.palette,
      imageUrl: candidate.imageUrl,
      imageCredit: candidate.imageCredit,
    }));
}

function balancedCandidates(profile: VisualProfile): SuggestionCandidate[] {
  const groups = profile.concepts
    .map((concept) => CANDIDATES
      .filter((candidate) => candidate.concept === concept)
      .sort((a, b) => b.score(profile) - a.score(profile)))
    .filter((group) => group.length > 0);
  if (!groups.length) {
    return CANDIDATES
      .map((candidate) => ({ candidate, score: candidate.score(profile) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ candidate }) => candidate);
  }
  const selected: SuggestionCandidate[] = [];
  for (let round = 0; selected.length < 5; round += 1) {
    let added = false;
    for (const group of groups) {
      const candidate = group[round];
      if (candidate && selected.length < 5) {
        selected.push(candidate);
        added = true;
      }
    }
    if (!added) break;
  }
  return selected;
}

export function shoppingLabelsFromFileName(fileName: string): SemanticLabel[] {
  const normalized = fileName
    .normalize("NFKD")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
  const rules: Array<[string, RegExp]> = [
    ["denim jeans", /\b(jeans?|denim)\b/],
    ["sneakers", /\b(sneakers?|trainers?|running shoes?|athletic shoes?)\b/],
    ["outerwear jacket", /\b(jackets?|coats?|outerwear|parkas?|trenches?)\b/],
    ["shirt top", /\b(shirts?|t shirts?|tops?|sweaters?|hoodies?|blouses?)\b/],
    ["tailored blazer", /\b(suits?|blazers?|tailoring)\b/],
    ["dress skirt", /\b(dresses?|gowns?|skirts?)\b/],
    ["handbag", /\b(handbags?|backpacks?|purses?|totes?|satchels?)\b/],
    ["fashion accessories", /\b(accessories|watches?|belts?|hats?|caps?|sunglasses)\b/],
    ["furniture", /\b(furniture|chairs?|sofas?|couches?|tables?|desks?|lamps?|decor)\b/],
  ];
  const matches = rules
    .filter(([, pattern]) => pattern.test(normalized))
    .map(([label]) => ({ label, score: 1 }));
  return matches.length ? matches : [{ label: "denim jeans", score: 1 }];
}

export function deriveShoppingConcepts(labels: SemanticLabel[]): string[] {
  const sorted = [...labels].sort((a, b) => b.score - a.score);
  const topScore = sorted[0]?.score ?? 0;
  const text = sorted
    .filter((item, index) => index === 0 || item.score >= Math.max(.12, topScore * .55))
    .map((item) => item.label)
    .join(" ");
  const rules: Array<[string, RegExp]> = [
    ["denim", /\b(jeans?|denim|blue jean)\b/i],
    ["sneakers", /\b(sneakers?|running shoe|trainers?|athletic shoe|loafer|boots?)\b/i],
    ["outerwear", /\b(jacket|coat|parka|trench|cardigan|poncho)\b/i],
    ["tops", /\b(t-?shirt|shirt|jersey|sweater|sweatshirt|hoodie|blouse)\b/i],
    ["tailoring", /\b(suit|blazer|bow tie|necktie)\b/i],
    ["dresses", /\b(dress|gown|skirt|miniskirt)\b/i],
    ["bags", /\b(handbag|backpack|purse|tote|satchel)\b/i],
    ["accessories", /\b(accessories|sunglasses|watch|necklace|bracelet|hat|cap|belt)\b/i],
    ["furniture", /\b(furniture|decor|lighting|chair|sofa|couch|table|desk|wardrobe|bookcase|lamp)\b/i],
  ];
  return rules.filter(([, pattern]) => pattern.test(text)).map(([concept]) => concept);
}

function semanticBoost(profile: VisualProfile, concept: string): number {
  return profile.concepts.includes(concept) ? 20 : -8;
}

export function describeVisualProfile(profile: VisualProfile): string[] {
  return [
    profile.warmth > .12 ? "warm color" : profile.warmth < -.12 ? "cool color" : "neutral temperature",
    profile.saturation > .55 ? "vivid palette" : profile.saturation < .27 ? "muted palette" : "balanced color",
    profile.contrast > .48 ? "strong contrast" : profile.contrast < .2 ? "soft contrast" : "balanced contrast",
    profile.edgeDensity > .45 ? "textured detail" : profile.edgeDensity < .2 ? "clean visual lines" : "mixed texture",
    profile.luminance > .66 ? "light, airy values" : profile.luminance < .36 ? "deep, moody values" : "mid-tone values",
    profile.colorDiversity > .48 ? "varied color" : "restrained color",
  ];
}

function migrateVersionOne(value: Record<string, unknown>): LocalOnboardingState {
  const clean = emptyLocalOnboarding();
  const legacyPhoto = value.photo as { dataUrl?: unknown; name?: unknown; tone?: unknown } | null;
  const photo = legacyPhoto && typeof legacyPhoto.dataUrl === "string" && typeof legacyPhoto.name === "string"
    ? [{ id: `legacy-${legacyPhoto.name}`, dataUrl: legacyPhoto.dataUrl, name: legacyPhoto.name, features: legacyFeatures(String(legacyPhoto.tone)) }]
    : [];
  const visualProfile = aggregateVisualProfile(photo);
  return {
    ...clean,
    displayName: typeof value.displayName === "string" ? value.displayName.trim().slice(0, 80) : "",
    photos: photo,
    visualProfile,
    suggestions: suggestionsForVisualProfile(visualProfile),
    stage: typeof value.displayName === "string" && value.displayName.trim() ? "this_you" : "profile",
  };
}

function legacyFeatures(tone: string): VisualFeatures {
  const warm = tone === "warm" ? .35 : tone === "cool" ? -.35 : 0;
  return { palette: warm > 0 ? ["#9a6648", "#d4ad78", "#4c5d4e"] : warm < 0 ? ["#4f6f82", "#a6b8bf", "#293842"] : ["#8b857c", "#d8d2c6", "#343a35"], saturation: tone === "colorful" ? .7 : .34, luminance: .52, contrast: .34, warmth: warm, edgeDensity: .32, colorDiversity: tone === "colorful" ? .65 : .3 };
}

function neutralVisualFeatures(): VisualFeatures {
  return {
    palette: ["#244f78", "#7892ab", "#d8d2c6"],
    saturation: .38,
    luminance: .5,
    contrast: .34,
    warmth: -.12,
    edgeDensity: .32,
    colorDiversity: .3,
  };
}

function bucketToHex(key: string): string {
  const [red, green, blue] = key.split("-").map(Number);
  return `#${[red, green, blue].map((part) => Math.min(255, part * 32 + 16).toString(16).padStart(2, "0")).join("")}`;
}

function clamp(value: number) { return Math.min(1, Math.max(0, value)); }
function clampSigned(value: number) { return Math.min(1, Math.max(-1, value)); }
function isStage(value: unknown): value is LocalStage { return ["profile", "this_you", "billing", "complete"].includes(String(value)); }
function isPaymentMethod(value: unknown): value is PaymentMethodId { return ["apple_pay", "google_pay", "paypal", "affirm", "card"].includes(String(value)); }

function isLocalPhoto(value: unknown): value is LocalPhoto {
  if (!value || typeof value !== "object") return false;
  const photo = value as Partial<LocalPhoto>;
  return typeof photo.id === "string" && typeof photo.dataUrl === "string" && photo.dataUrl.startsWith("data:image/jpeg;base64,") && typeof photo.name === "string" && isVisualFeatures(photo.features);
}

function isSemanticLabel(value: unknown): value is SemanticLabel {
  if (!value || typeof value !== "object") return false;
  const label = value as Partial<SemanticLabel>;
  return typeof label.label === "string" && label.label.length > 0 && label.label.length <= 100 &&
    typeof label.score === "number" && Number.isFinite(label.score) && label.score >= 0 && label.score <= 1;
}

function isVisualFeatures(value: unknown): value is VisualFeatures {
  if (!value || typeof value !== "object") return false;
  const features = value as Partial<VisualFeatures>;
  return Array.isArray(features.palette) && features.palette.every((item) => typeof item === "string") &&
    [features.saturation, features.luminance, features.contrast, features.warmth, features.edgeDensity, features.colorDiversity].every((item) => typeof item === "number" && Number.isFinite(item));
}

function isStyleProfile(value: unknown): value is ConfirmedStyleProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Partial<ConfirmedStyleProfile>;
  return profile.version === 2 && Array.isArray(profile.activeCategories) && profile.activeCategories.every((entry) => typeof entry === "string") && Boolean(profile.positiveAttributes) && typeof profile.positiveAttributes === "object" && Array.isArray(profile.exclusions) && profile.exclusions.every((entry) => typeof entry === "string") && typeof profile.updatedAt === "string";
}
