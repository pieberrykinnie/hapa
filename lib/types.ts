export interface Product {
  id: string;
  title: string;
  price: number;
  currency: string;
  salePct: number | null;
  merchant: string;
  image: string; // empty string → striped placeholder
  gallery: string[];
  link: string; // real merchant URL
  tags: string[];
  description: string;
}

export interface FeedResponse {
  items: Product[];
  nextCursor: number | null;
}

export interface StyleDNA {
  likes: string[]; // ["minimal", "earth-tones", "desk"]
  dealbreakers: string[]; // ["neon", "rgb"]
  vibeHistory: { label: string; at: string }[];
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
