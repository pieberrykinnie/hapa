export interface Product {
  id: string;
  title: string;
  price: number;
  currency: string;
  salePct: number | null;
  merchant: string;
  image: string; // empty string → striped placeholder
  gallery: string[];
  link: string; // real merchant URL — the agent's target
  tags: string[];
  description: string;
}

export interface FeedResponse {
  items: Product[];
  nextCursor: number | null;
}

export interface StyleDNA {
  name: string;
  likes: string[]; // ["minimal", "earth-tones", "desk"]
  dealbreakers: string[]; // ["neon", "rgb"]
  vibeHistory: { label: string; at: string }[];
}

export type OnboardingStage =
  | "profile"
  | "photo_processing"
  | "this_you"
  | "billing"
  | "complete";

export type SuggestionSource = "photo" | "generic";
export type SuggestionDecision = "accept" | "reject";

export interface ShopperProfile {
  userId: string;
  displayName: string | null;
  photoPath: string | null;
  photoVersion: number;
  photoPreviewUrl: string | null;
  onboardingStage: OnboardingStage;
  preferredPaymentMethod: PaymentMethodId | null;
  billingDeferred: boolean;
}

export interface StyleSuggestion {
  id: string;
  position: number;
  category: string;
  title: string;
  description: string;
  positiveAttributes: string[];
  rejectionAttributes: string[];
  imageKey: string;
  source: SuggestionSource;
  reason?: string;
  palette?: string[];
  imageUrl?: string;
  imageCredit?: string;
}

export interface ConfirmedStyleProfile {
  activeCategories: string[];
  positiveAttributes: Record<string, number>;
  exclusions: string[];
  context: string | null;
  priceCeiling: number | null;
  version: 2;
  updatedAt: string;
}

export type PaymentMethodId =
  | "apple_pay"
  | "google_pay"
  | "paypal"
  | "affirm"
  | "card";

export type PaymentReadinessStatus =
  | "available"
  | "setup_required"
  | "unavailable";

export interface PaymentMethodReadiness {
  id: PaymentMethodId;
  name: string;
  status: PaymentReadinessStatus;
  reason: string;
  selectable: boolean;
}

export interface FeedState {
  items: Product[];
  activeCategory: string; // "for-you" | derived tags
  cursor: number | null; // pagination
  status: "idle" | "loading" | "shifting";
}

export interface VibeShift {
  add_keywords: string[];
  remove_keywords: string[];
  dealbreakers: string[];
}

export interface OnboardingCard {
  id: string;
  label: string;
  caption: string; // placeholder annotation until real photos land
  image: string;
  tags: string[];
}

/**
 * A vibe photo the user uploaded during onboarding. Held client-side only —
 * `url` is an object URL, never sent anywhere. Tag derivation is stubbed until
 * a vision model is wired.
 */
export interface VibeImage {
  id: string;
  url: string;
  name: string;
}

export type BillingProvider = "applepay" | "gpay" | "paypal" | "affirm" | "card";

/**
 * What we keep after the user connects a payment method.
 *
 * DEMO SCOPE: this is a simulated provider connection. We deliberately never
 * collect or store a card number, expiry, or CVV — only the display metadata a
 * real tokenized integration would hand back. Wiring an actual processor means
 * swapping `connectBilling` for its SDK; nothing here needs to change shape.
 */
export interface BillingMethod {
  provider: BillingProvider;
  label: string; // "Visa ·· 4242", "PayPal", "Affirm"
  connectedAt: string;
}

export type PurchaseStage = "confirm" | "working" | "done" | "failed";

export interface PurchaseStep {
  label: string;
  done: boolean;
}

export interface Order {
  product: Product;
  stage: PurchaseStage;
  steps: PurchaseStep[];
  orderRef: string | null;
  error: string | null;
}
