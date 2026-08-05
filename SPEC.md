# Aura — Implementation Spec

**The AI DJ for Shopping.** A voice-steerable, infinite shopping feed that learns your style from 5 swipes and pivots the entire feed when you talk to it.

This document is the single source of truth for implementation. It is written to be split across ~5 parallel agents (see §12 Workstreams). Every cross-workstream contract lives in §3 (Types) and §5 (API). **Nobody changes a file outside their workstream without updating §3/§5 first.**

---

## 1. Constraints & Decisions

| Decision | Choice | Why |
|---|---|---|
| Framework | **Next.js 16.3, App Router** (already installed) | In repo. Read `node_modules/next/dist/docs/` before writing route handlers — this Next version has breaking changes vs. training data. |
| Package manager | **pnpm** (`packageManager: pnpm@11.2.2`) | Lockfile present. Do not run `npm install` — it created a stray `package-lock.json`; delete it. |
| Styling | Tailwind CSS v4 (`@import "tailwindcss"` in `app/globals.css`) | Already configured via `@tailwindcss/postcss`. No `tailwind.config.js` — use `@theme` in CSS. |
| Animation | **`motion`** (`pnpm add motion`), import from `motion/react` | Framer Motion's current package name. `framer-motion` is the legacy alias. |
| PWA | **Native `app/manifest.ts`** + `apple-mobile-web-app-capable` meta | Do **not** use `next-pwa` — it does not support Next 16 and will break the build. Offline caching is out of scope; we only need standalone display + installability. |
| Voice | `@vapi-ai/web` (client-side only) | Runs in browser, needs mic permission. |
| Product data | SerpApi `google_shopping` engine, server-side only | API key must never reach the client. |
| "ML model" | JSON `StyleDNA` in React Context + an LLM query-synthesis call | No training. LLM turns StyleDNA → search query. |
| LLM | Anthropic `claude-opus-5` via `@anthropic-ai/sdk`, structured outputs | Deterministic JSON out. Optional — there is a rules-based fallback (§5.4) so the demo works with zero LLM keys. |
| Push | OneSignal Web SDK v16 + a manual trigger route | iOS 16.4+ requires the PWA be installed to the home screen. |
| Persistence | `localStorage` only | No DB. Hackathon scope. |
| Deploy | Vercel | Set env vars in project settings. |

### Non-negotiable demo-survival rules
1. **Every network path has a fallback.** SerpApi down/rate-limited/slow → serve `fallback_feed.json`. LLM down → rules-based query builder. Vapi down → a text-input "cheat" bar behind `?debug=1`.
2. **No route handler may take >8s.** Hard `AbortController` timeouts on all outbound fetches (SerpApi 6s, Anthropic 8s).
3. **The feed never renders empty.** If a fetch returns 0 items, keep the previous items and toast an error.

---

## 2. File Tree (target)

```
hapa/
├── app/
│   ├── layout.tsx                 # root layout; providers; PWA meta; OneSignal script  [WS-A]
│   ├── globals.css                # Tailwind v4 + @theme tokens + safe-area vars        [WS-A]
│   ├── manifest.ts                # MetadataRoute.Manifest                              [WS-A]
│   ├── page.tsx                   # entry: routes to Onboarding or Feed by profile state[WS-A]
│   └── api/
│       ├── feed/route.ts          # POST → ProductCard[]                                [WS-E]
│       ├── vibe/route.ts          # POST → StyleDNA patch (LLM query synthesis)         [WS-E]
│       └── notify/route.ts        # POST → OneSignal push (demo trigger)                [WS-F]
├── components/
│   ├── onboarding/
│   │   ├── SwipeDeck.tsx          # the 5-card Tinder stack                             [WS-B]
│   │   ├── SwipeCard.tsx          # single draggable card                               [WS-B]
│   │   └── seedCards.ts           # the 5 hardcoded aesthetic cards + their DNA deltas  [WS-B]
│   ├── feed/
│   │   ├── Feed.tsx               # scroll-snap container + infinite loader             [WS-C]
│   │   ├── ProductSlide.tsx       # one full-screen product                             [WS-C]
│   │   └── FeedSkeleton.tsx       # shimmer placeholder                                 [WS-C]
│   ├── voice/
│   │   ├── MicButton.tsx          # glowing FAB, call state machine                     [WS-D]
│   │   └── TranscriptOverlay.tsx  # live partial transcript                             [WS-D]
│   ├── ui/
│   │   ├── Toast.tsx              # vibe-shift toast + toast host                       [WS-A]
│   │   └── DebugBar.tsx           # ?debug=1 text input that fakes shift_feed_vibe      [WS-A]
├── lib/
│   ├── types.ts                   # ⚠ SHARED CONTRACT — see §3                          [WS-A, frozen early]
│   ├── profile.ts                 # StyleDNA reducer + localStorage persist             [WS-A]
│   ├── ProfileContext.tsx         # React Context provider + hooks                      [WS-A]
│   ├── query.ts                   # StyleDNA → search query (rules-based fallback)      [WS-E]
│   ├── serpapi.ts                 # SerpApi client + normalizer                         [WS-E]
│   ├── vapi.ts                    # assistant config + system prompt + tool defs        [WS-D]
│   └── env.ts                     # typed env accessor, server-only                     [WS-E]
├── data/
│   └── fallback_feed.json         # ≥30 pre-tagged products                             [WS-E]
├── public/
│   ├── icon-192.png, icon-512.png, apple-touch-icon.png                                 [WS-A]
│   ├── seed/*.jpg                 # 5 onboarding images (or remote URLs)                [WS-B]
│   └── OneSignalSDKWorker.js      # must be at origin root, content-type js             [WS-F]
├── .env.local.example                                                                    [WS-E]
└── SPEC.md
```

---

## 3. Shared Types — `lib/types.ts`

**Write this file first. Freeze it. Everything else compiles against it.**

```ts
// lib/types.ts

/** A single product tile in the feed. Normalized from SerpApi or fallback JSON. */
export interface ProductCard {
  id: string;              // stable; serpapi product_id, else `fb-${index}`
  title: string;
  price: string;           // formatted, e.g. "$189.00"
  extractedPrice: number | null;
  source: string;          // merchant name, e.g. "REI"
  thumbnail: string;       // absolute image URL
  link: string;            // where "Buy Now" opens
  rating: number | null;
  reviews: number | null;
  delivery: string | null;
  tags: string[];          // lowercase keywords, used for client-side dedupe/filtering
}

/** The "lightweight ML model". Lives in React Context, persisted to localStorage. */
export interface StyleDNA {
  version: 1;
  /** Positive style signals, weighted. Higher = stronger preference. */
  affinities: Record<string, number>;   // e.g. { minimalist: 2, "matte black": 1 }
  /** Hard negatives. Anything matching these is filtered/never queried. */
  dealbreakers: string[];               // e.g. ["rgb", "neon"]
  /** Current active category focus — drives the query verb. */
  categories: string[];                 // e.g. ["desk accessories", "office"]
  /** Optional freeform context the LLM injected (weather, location, occasion). */
  context: string | null;               // e.g. "camping in Squamish, expecting rain"
  priceCeiling: number | null;
  updatedAt: number;                    // Date.now()
}

/** Delta applied to StyleDNA. Produced by swipes AND by the voice tool call. */
export interface VibeShift {
  addAffinities?: string[];
  removeAffinities?: string[];
  addDealbreakers?: string[];
  removeDealbreakers?: string[];
  setCategories?: string[];
  setContext?: string | null;
  setPriceCeiling?: number | null;
  /** Human-readable summary for the toast, e.g. "+Camping, +Waterproof, -Neon" */
  label: string;
}

/** POST /api/feed request */
export interface FeedRequest {
  profile: StyleDNA;
  page: number;            // 1-indexed
  pageSize?: number;       // default 12
  /** ids already shown, so the server can drop dupes */
  seen?: string[];
}

/** POST /api/feed response */
export interface FeedResponse {
  items: ProductCard[];
  query: string;           // the query actually used (shown in DebugBar)
  source: "serpapi" | "fallback";
  hasMore: boolean;
}

/** POST /api/vibe request — raw utterance from Vapi's tool call */
export interface VibeRequest {
  profile: StyleDNA;
  /** Arguments Vapi passed to shift_feed_vibe */
  newKeywords: string[];
  dealbreakers: string[];
  rawUtterance?: string;
}

/** POST /api/vibe response */
export interface VibeResponse {
  shift: VibeShift;
  query: string;           // pre-computed search query for the new vibe
  source: "llm" | "rules";
}
```

---

## 4. State Model

### 4.1 `lib/profile.ts`

```ts
export const EMPTY_DNA: StyleDNA = {
  version: 1, affinities: {}, dealbreakers: [], categories: [],
  context: null, priceCeiling: null, updatedAt: 0,
};

export function applyShift(dna: StyleDNA, shift: VibeShift): StyleDNA
export function loadProfile(): StyleDNA | null      // localStorage 'aura.profile.v1'
export function saveProfile(dna: StyleDNA): void
export function clearProfile(): void
```

`applyShift` rules:
- `addAffinities` → increment weight by 1 (cap 5), creating key if absent.
- `removeAffinities` → delete key.
- `addDealbreakers` → union, lowercase, dedupe. **Also deletes any affinity with the same key.**
- `setCategories` → **replace**, not merge. This is what makes the feed "flush".
- Always bump `updatedAt`.

### 4.2 `lib/ProfileContext.tsx`

```tsx
'use client';
export function ProfileProvider({ children }: { children: React.ReactNode })
export function useProfile(): {
  profile: StyleDNA;
  ready: boolean;               // false until localStorage hydration completes
  onboarded: boolean;           // categories.length > 0 || Object.keys(affinities).length > 0
  shift: (s: VibeShift) => void;
  reset: () => void;
  /** monotonically increments on every shift — Feed uses this as its reset key */
  epoch: number;
}
```

**Hydration rule:** read `localStorage` in a `useEffect`, never during render (avoids hydration mismatch). Render `null` (or a splash) while `ready === false`.

**`epoch` is the flush mechanism.** `Feed.tsx` keys its internal item array on `epoch`; when voice fires a shift, `epoch` increments, the feed drops all items, scrolls to top, and refetches page 1. This is the visual "whoosh" moment of the demo.

---

## 5. Server API

Read `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` before writing these. Route Handlers are `app/api/<name>/route.ts` exporting `POST`. They are **not cached by default** — do not add `export const dynamic`.

### 5.1 `lib/env.ts` (server-only)

```ts
import 'server-only';
export const env = {
  SERPAPI_KEY: process.env.SERPAPI_KEY ?? '',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? '',
  ONESIGNAL_APP_ID: process.env.ONESIGNAL_APP_ID ?? '',
  ONESIGNAL_REST_API_KEY: process.env.ONESIGNAL_REST_API_KEY ?? '',
  DEMO_TRIGGER_SECRET: process.env.DEMO_TRIGGER_SECRET ?? 'aura-demo',
  FORCE_FALLBACK: process.env.FORCE_FALLBACK === '1',
};
```

`.env.local.example`:
```
SERPAPI_KEY=
ANTHROPIC_API_KEY=
ONESIGNAL_APP_ID=
ONESIGNAL_REST_API_KEY=
DEMO_TRIGGER_SECRET=aura-demo
FORCE_FALLBACK=0
NEXT_PUBLIC_VAPI_PUBLIC_KEY=
NEXT_PUBLIC_ONESIGNAL_APP_ID=
```

### 5.2 `POST /api/feed`

Body: `FeedRequest`. Returns: `FeedResponse`.

Flow:
1. Build query: `buildQuery(profile)` from `lib/query.ts` (§5.4).
2. If `env.FORCE_FALLBACK` or `!env.SERPAPI_KEY` → go to fallback.
3. Fetch SerpApi with a **6s AbortController timeout**:
   ```
   GET https://serpapi.com/search
     ?engine=google_shopping
     &q=<query>
     &api_key=<SERPAPI_KEY>
     &gl=ca&hl=en
     &num=20
     &start=<(page-1)*20>
     [&max_price=<priceCeiling> if set]
   ```
4. Normalize `json.shopping_results[]` → `ProductCard[]` (see `lib/serpapi.ts` below).
5. Client-side-safety filter: drop any item whose `title` (lowercased) contains a dealbreaker string.
6. Drop items whose `id` is in `seen`.
7. If step 3–6 throws, times out, or yields `< 4` items → **fallback** (`source: "fallback"`).
8. Slice to `pageSize` (default 12). `hasMore = true` always (infinite scroll; fallback loops with shuffle).

Always respond `200` with a valid `FeedResponse`. **Never 500.** Log server-side, return fallback.

### 5.3 `lib/serpapi.ts`

```ts
export function normalize(r: any, i: number): ProductCard
```
Field mapping (verified against SerpApi's Google Shopping Results API):

| ProductCard | SerpApi field | Fallback |
|---|---|---|
| `id` | `product_id` | `` `sa-${page}-${i}` `` |
| `title` | `title` | `"Untitled"` — drop item if missing |
| `price` | `price` | `""` |
| `extractedPrice` | `extracted_price` | `null` |
| `source` | `source` | `"Shop"` |
| `thumbnail` | `thumbnail` | drop item if missing |
| `link` | `product_link` ?? `link` | drop item if both missing |
| `rating` | `rating` | `null` |
| `reviews` | `reviews` | `null` |
| `delivery` | `delivery` | `null` |
| `tags` | derived: lowercase title split on non-alnum, dedupe, drop stopwords, cap 12 | `[]` |

> Note: `product_link` is a Google Shopping URL, not always the merchant's own page. Acceptable for the demo — it opens a real product page. If a direct merchant link is needed later, the `google_shopping_light` engine returns seller links.

### 5.4 `lib/query.ts` + `POST /api/vibe`

**`buildQuery(dna: StyleDNA): string`** — deterministic, no network:
```
[top 3 affinities by weight] + [categories.join(' ')] + [" -"+d for d in dealbreakers]
```
e.g. `minimalist matte-black desk accessories -rgb -neon`. Cap at 120 chars.

**`POST /api/vibe`** takes the loose keywords Vapi extracted and produces a clean `VibeShift` + query.

LLM path (`source: "llm"`), using the Anthropic TypeScript SDK:
```ts
import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const response = await client.messages.create({
  model: 'claude-opus-5',
  max_tokens: 1024,
  thinking: { type: 'disabled' },          // latency; valid at effort <= high
  output_config: {
    effort: 'low',
    format: {
      type: 'json_schema',
      schema: {
        type: 'object',
        properties: {
          addAffinities:    { type: 'array', items: { type: 'string' } },
          addDealbreakers:  { type: 'array', items: { type: 'string' } },
          setCategories:    { type: 'array', items: { type: 'string' } },
          setContext:       { type: 'string' },
          label:            { type: 'string' },
          query:            { type: 'string' },
        },
        required: ['addAffinities','addDealbreakers','setCategories','setContext','label','query'],
        additionalProperties: false,
      },
    },
  },
  system: VIBE_SYSTEM_PROMPT,
  messages: [{ role: 'user', content: JSON.stringify({ profile, newKeywords, dealbreakers, rawUtterance }) }],
}, { timeout: 8000 });
```
Parse `response.content.find(b => b.type === 'text').text` as JSON. On **any** failure (no key, timeout, parse error, `stop_reason === 'refusal'`) → rules path.

`VIBE_SYSTEM_PROMPT` (verbatim):
```
You convert a shopper's spoken request into a shopping-feed configuration.

You receive: their current StyleDNA profile, keywords the voice agent extracted,
and (optionally) their raw utterance.

Rules:
- setCategories REPLACES the shopper's current focus. Pick 1-3 concrete
  shoppable product categories, e.g. ["rain jackets","camping gear"].
  Never use abstract words like "outdoors" alone.
- addAffinities: 2-5 concrete visual/material attributes implied by the request
  or already in their profile that still apply. Lowercase.
  e.g. ["waterproof","earth tone","matte"]
- addDealbreakers: anything they explicitly rejected, plus anything in their
  existing dealbreakers that still applies. Lowercase, single words or short
  phrases. e.g. ["neon","rgb"]
- setContext: one short phrase capturing situation (weather, trip, occasion),
  or "" if none.
- label: a punchy toast string of the deltas, format "+Camping, +Waterproof, -Neon, -Office".
  Max 60 chars.
- query: a Google Shopping search string. Format:
  "<2-3 affinities> <primary category>" then " -<dealbreaker>" for each dealbreaker.
  Max 120 chars. No quotes, no boolean operators other than the minus prefix.

Return JSON only, matching the provided schema.
```

Rules path (`source: "rules"`) — pure function, no network:
- `setCategories = newKeywords.filter(k => k.split(' ').length <= 3).slice(0, 3)`
- `addAffinities = newKeywords.slice(0, 5)`
- `addDealbreakers = dealbreakers`
- `label = "+" + addAffinities.slice(0,2).join(", +") + (dealbreakers.length ? ", -" + dealbreakers.join(", -") : "")`
- `query = buildQuery(applyShift(profile, shift))`

### 5.5 `data/fallback_feed.json`

`ProductCard[]`, **≥30 items**, hand-curated to cover the demo's two vibes plus filler:

| Bucket | Count | Tags must include |
|---|---|---|
| Minimalist desk / tech | 10 | `minimalist`, `desk`, `office`, `matte` |
| Outdoor / camping / rain | 10 | `camping`, `waterproof`, `outdoor`, `earth tone`, `olive` |
| Streetwear / apparel | 5 | `streetwear`, `hoodie` |
| Gaming / RGB (negative control) | 5 | `rgb`, `gaming`, `neon` |

**The olive rain jacket must exist and be the first item that matches `camping + waterproof`** — it's the hero shot at 1:15 in the demo. Use a real REI/Arc'teryx product URL and a real (hotlink-safe) image.

Fallback selection algorithm (`selectFallback(profile, page, pageSize, seen)`):
1. Score each item: `+2` per tag matching a category token, `+1` per tag matching an affinity key (× its weight, capped), `-1000` if any tag matches a dealbreaker.
2. Drop score `< 0` and anything in `seen`.
3. Sort by score desc, then stable-shuffle by a seed derived from `page` so pages differ.
4. If the pool is exhausted, recycle from the full list with fresh ids (`${id}-p${page}`) so infinite scroll never stalls.

---

## 6. Onboarding — Swipe Deck (WS-B)

### 6.1 `components/onboarding/seedCards.ts`

Five cards, each with an image and the `VibeShift` produced by a **right** swipe. A **left** swipe applies the inverse: its `addAffinities` become `addDealbreakers` (first 2 only) and categories are ignored.

```ts
export interface SeedCard {
  id: string; label: string; image: string; caption: string;
  right: VibeShift;   // like
}
```

| id | label | Suggested imagery | right.setCategories | right.addAffinities |
|---|---|---|---|---|
| `street` | Streetwear | oversized hoodie flatlay | `["hoodies","streetwear"]` | `["streetwear","oversized","graphic"]` |
| `desk` | Minimal Desk | white desk, wood, monitor | `["desk accessories","office"]` | `["minimalist","matte","wood","monochrome"]` |
| `rgb` | Gaming Rig | RGB PC | `["gaming accessories"]` | `["rgb","gaming","backlit"]` |
| `vintage` | Vintage Leather | brown leather jacket | `["leather jackets"]` | `["vintage","leather","brown"]` |
| `outdoor` | Trail Gear | hiking pack on ridge | `["hiking gear","outdoor"]` | `["outdoor","technical","earth tone"]` |

Images: put 5 JPEGs in `public/seed/`. Keep each **under 300 KB**, 3:4 aspect. Serve with plain `<img>` (see §11 Images) or `next/image` with `unoptimized`.

### 6.2 `SwipeDeck.tsx` behavior
- Renders the stack with the top card interactive; the two below are visible at `scale: 1 - i*0.05, y: i*12`.
- `motion/react`: `drag="x"`, `dragConstraints={{left:0,right:0}}`, `dragElastic={0.6}`.
- Commit threshold: `|offset.x| > 110 || |velocity.x| > 500`.
- On commit: animate card out to `x: ±600, rotate: ±20, opacity: 0` over 250 ms, then `shift(...)` and advance the index.
- Overlay tint: green at `x > 40`, red at `x < -40`, opacity mapped via `useTransform`.
- Also render **LIKE / NOPE tap buttons** underneath — a fat-fingered swipe on stage is a demo-killer. Buttons must fire the identical code path.
- After card 5: play a 700 ms "Building your Style DNA…" beat with the DNA keys ticking in, then the parent switches to the Feed. Do not hold longer — the whole segment is budgeted at 25 s.
- Progress dots at top (`1/5`).

Accessibility/robustness: card images must have `alt`; the deck must be keyboard-operable (← / →).

---

## 7. Feed (WS-C)

### 7.1 `Feed.tsx`
- Container: `h-[100dvh] overflow-y-scroll snap-y snap-mandatory overscroll-y-contain`, `scrollbar-width: none`.
- Each child: `h-[100dvh] snap-start snap-always`.
- State: `items: ProductCard[]`, `page`, `loading`, `error`.
- **Reset on `epoch` change**: `useEffect(() => { setItems([]); setPage(1); scrollRef.current?.scrollTo({top:0}); void load(1, /*replace*/true); }, [epoch])`.
- Infinite load: `IntersectionObserver` on a sentinel placed 3 slides from the end → `load(page + 1)`. Guard with a `loadingRef` so it fires once.
- `load()` POSTs `/api/feed` with `{ profile, page, seen: items.map(i => i.id) }`. Appends (or replaces).
- On error: keep existing items, `toast.error("Feed hiccup — retrying")`, retry once after 1.5 s.
- Prefetch the next slide's image (`new Image().src = next.thumbnail`) as the user lands on each slide.

### 7.2 `ProductSlide.tsx`
Full-bleed layout:
- Background: product `thumbnail`, `object-cover`, plus a `bg-gradient-to-t from-black/85 via-black/20 to-transparent` scrim.
- Bottom-left stack: `source` (small, uppercase, tracking-wide), `title` (2-line clamp, text-2xl font-semibold), `price` (text-3xl), rating row (`★ 4.6 · 1,204`), `delivery` (text-xs opacity-70).
- **Buy Now**: full-width pill button, `<a href={link} target="_blank" rel="noopener noreferrer">`. Must be above the safe-area inset and clear of the mic FAB — reserve `pb-28`.
- Entry animation: `motion.div` `initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:0.5}}`.
- Image `loading="lazy"` except the first two slides (`eager`).

### 7.3 Safe areas
`app/layout.tsx` viewport must include `viewport-fit=cover`; `globals.css` defines:
```css
@theme { --spacing-safe-b: env(safe-area-inset-bottom, 0px); }
```
Bottom-anchored UI uses `padding-bottom: calc(1rem + env(safe-area-inset-bottom))`.

---

## 8. Voice — Vapi (WS-D)

Package: `pnpm add @vapi-ai/web`. Public key in `NEXT_PUBLIC_VAPI_PUBLIC_KEY`.

### 8.1 `lib/vapi.ts`

```ts
import Vapi from '@vapi-ai/web';

export function createVapi() {
  return new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY!);
}

export function assistantConfig(profile: StyleDNA) {
  return {
    firstMessage: "I'm listening — what are we shopping for?",
    model: {
      provider: 'anthropic',
      model: 'claude-opus-5',
      messages: [{ role: 'system', content: systemPrompt(profile) }],
      tools: [SHIFT_FEED_VIBE_TOOL],
    },
    voice: { provider: '11labs', voiceId: '21m00Tcm4TlvDq8ikWAM' },
    transcriber: { provider: 'deepgram' },
    clientMessages: ['tool-calls', 'transcript', 'speech-update'],
  };
}
```
> If the Anthropic provider is unavailable in the team's Vapi account, fall back to `{ provider: 'openai', model: 'gpt-4o' }` — the tool contract is unchanged.

**Tool definition** (client-side tool — Vapi emits it, we handle it; it returns no result to the model, which is fine because the assistant's spoken confirmation is scripted in the system prompt):
```ts
export const SHIFT_FEED_VIBE_TOOL = {
  type: 'function',
  async: true,
  function: {
    name: 'shift_feed_vibe',
    description:
      'Replace the shopping feed with a new vibe. Call this as soon as the user ' +
      'expresses a new shopping direction, mood, activity, or constraint.',
    parameters: {
      type: 'object',
      properties: {
        new_keywords: {
          type: 'array', items: { type: 'string' },
          description: 'Concrete product categories and visual attributes to pull in, e.g. ["rain jacket","camping gear","waterproof","earth tone"]',
        },
        dealbreakers: {
          type: 'array', items: { type: 'string' },
          description: 'Things to exclude, e.g. ["neon","rgb"]',
        },
        context: {
          type: 'string',
          description: 'Situation in one short phrase, e.g. "camping in Squamish, rainy"',
        },
      },
      required: ['new_keywords', 'dealbreakers'],
    },
  },
} as const;
```

**System prompt** (`systemPrompt(profile)`), verbatim, with the profile JSON interpolated:
```
You are Aura, a shopping DJ. You are terse, warm, and fast. Never more than
two short sentences.

The user is scrolling a live shopping feed. Here is their current style profile:
<profile>
{{PROFILE_JSON}}
</profile>

When the user says anything that implies a new shopping direction — a mood, an
activity, a trip, a season, a color they hate — you MUST immediately call the
shift_feed_vibe tool. Do not ask clarifying questions first. Infer aggressively:
"camping in the rain" implies waterproof shells, tents, insulated layers.

After calling the tool, confirm in one sentence naming what you dropped and what
you're pulling up. Example: "Got it — ditching the desk gear, pulling up
earth-tone waterproof camping essentials."

Never read out product listings. Never mention prices. Never say the word "tool"
or "function". If the user just chats, chat briefly and do not call the tool.
```

### 8.2 `MicButton.tsx`

State machine: `idle → connecting → listening → speaking → idle`.

```tsx
vapi.on('call-start',   () => setState('listening'));
vapi.on('call-end',     () => setState('idle'));
vapi.on('speech-start', () => setState('speaking'));
vapi.on('speech-end',   () => setState('listening'));
vapi.on('error',        (e) => { console.error(e); setState('idle'); toast.error('Mic unavailable'); });
vapi.on('message', (message) => {
  if (message.type === 'transcript') setTranscript(message.transcript);
  if (message.type === 'tool-calls') {
    for (const call of message.toolCallList ?? []) {
      if (call.function?.name !== 'shift_feed_vibe') continue;
      const args = typeof call.function.arguments === 'string'
        ? JSON.parse(call.function.arguments || '{}')
        : (call.function.arguments ?? {});
      void handleShift(args);
    }
  }
});
```

`handleShift(args)`:
1. `POST /api/vibe` with `{ profile, newKeywords: args.new_keywords ?? [], dealbreakers: args.dealbreakers ?? [], rawUtterance: lastTranscript }`.
2. On response, `shift(res.shift)` → bumps `epoch` → Feed flushes.
3. `toast.vibe(res.shift.label)` — the `[Vibe Shift: +Camping, +Waterproof, -Neon, -Office]` chip.
4. **Timeout guard: if `/api/vibe` hasn't returned in 2.5 s, apply the rules-based shift client-side immediately** so the feed flushes on beat with the assistant's voice. Late server response is ignored if the epoch already advanced.

FAB visuals: `fixed bottom-6 left-1/2 -translate-x-1/2 z-50`, 64 px circle. Idle = subtle pulse ring. Listening = animated concentric ripples driven by `vapi.on('volume-level', v => setVol(v))`. Speaking = solid glow. Tap toggles `vapi.start(assistantConfig(profile))` / `vapi.stop()`.

**Mic permission:** request on first tap, not on mount. If denied, toast with a link to settings and auto-open the DebugBar.

### 8.3 `DebugBar.tsx` (the demo parachute)
Shown when `location.search` contains `debug=1`, or after any Vapi error. A text input; on submit it naively tokenizes (`words after "not"/"no"/"without" → dealbreakers`, rest → keywords) and calls the exact same `handleShift`. **This must be tested — it is what saves the demo if the venue WiFi eats WebRTC.**

---

## 9. PWA & Push (WS-A / WS-F)

### 9.1 `app/manifest.ts`
```ts
import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Aura', short_name: 'Aura',
    description: 'The AI DJ for shopping',
    start_url: '/', display: 'standalone',
    background_color: '#0a0a0a', theme_color: '#0a0a0a',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
```

### 9.2 `app/layout.tsx` metadata
```ts
export const metadata: Metadata = {
  title: 'Aura', description: 'The AI DJ for shopping',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Aura' },
};
export const viewport: Viewport = {
  themeColor: '#0a0a0a', viewportFit: 'cover',
  width: 'device-width', initialScale: 1, maximumScale: 1, userScalable: false,
};
```
Body: `bg-black text-white overscroll-none select-none`.

### 9.3 OneSignal (WS-F)
1. `public/OneSignalSDKWorker.js` — download from the OneSignal dashboard. Must be served from origin root as `application/javascript`. Vercel does this for `public/` automatically.
2. In `layout.tsx`, `<Script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" strategy="afterInteractive" />` plus an inline init:
   ```js
   window.OneSignalDeferred = window.OneSignalDeferred || [];
   OneSignalDeferred.push(async (OneSignal) => {
     await OneSignal.init({ appId: NEXT_PUBLIC_ONESIGNAL_APP_ID });
   });
   ```
3. Prompt for push permission **after onboarding completes**, never on load.
4. `POST /api/notify` — body `{ secret, title, body, url }`. Verify `secret === env.DEMO_TRIGGER_SECRET`, then:
   ```
   POST https://onesignal.com/api/v1/notifications
   Authorization: Basic <ONESIGNAL_REST_API_KEY>
   { app_id, included_segments: ["Subscribed Users"], headings: {en: title},
     contents: {en: body}, url }
   ```
5. Ship a trivial trigger page at `/trigger` (or just a `curl` in the runbook) so a teammate can fire it from a laptop at 1:50.

**iOS reality check:** web push on iOS requires iOS 16.4+ **and** the site added to the Home Screen. Test this on the actual demo phone the day before. If it fails, the outro falls back to a screen-recorded notification.

---

## 10. Visual Design

Dark, high-contrast, single accent.

```css
@theme {
  --color-bg: #0a0a0a;
  --color-fg: #f5f5f5;
  --color-muted: #a1a1aa;
  --color-accent: #c7f04a;   /* acid lime — reads as "DJ", not "e-commerce blue" */
  --color-danger: #ff5c5c;
  --font-display: var(--font-geist-sans);
}
```
- Everything is edge-to-edge. No cards-in-containers, no visible chrome except the FAB and the toast.
- Motion: 200–280 ms, `cubic-bezier(0.22, 1, 0.36, 1)`. Nothing longer than 400 ms.
- Toast: top-center, `bg-accent text-black`, mono font, rounded-full, auto-dismiss 4 s. Renders exactly as `[Vibe Shift: {label}]`.
- Feed flush transition: fade out at `opacity: 0` over 180 ms → swap → fade in with a 40 px upward slide. This is the moment the audience is watching.

---

## 11. Cross-cutting Gotchas

1. **Images.** Product thumbnails come from arbitrary hosts (`encrypted-tbn*.gstatic.com`, merchant CDNs). Do **not** fight `next/image` `remotePatterns` — use a plain `<img>` for product thumbnails and add `/* eslint-disable @next/next/no-img-element */` at the top of `ProductSlide.tsx`. Local seed images may use `next/image`.
2. **`'use client'`** on every component with hooks/state: all of `components/**`, `ProfileContext.tsx`, `lib/vapi.ts`.
3. **Server-only files** (`lib/env.ts`, `lib/serpapi.ts`, route handlers) must never be imported from a client component. `lib/query.ts` and `lib/profile.ts` must stay **isomorphic** (no `server-only`, no `window` at module scope) — both sides use them.
4. **Typed routes.** Next 16 generates `RouteContext<'/path'>` and `LayoutProps<'/'>` globals during `next dev` / `next build`. `app/layout.tsx` already uses `LayoutProps<"/">`. Run `pnpm dev` once before typechecking a fresh clone.
5. **The `AGENTS.md` block** at the top of the repo is regenerated by `next dev`. Don't delete it; commit it if it shows up dirty.
6. **Delete `package-lock.json`** — the repo uses pnpm.
7. **iOS Safari scroll.** `100vh` is wrong; use `100dvh`. `overscroll-behavior: none` on `body` and the feed container prevents the rubber-band that breaks scroll-snap.
8. **Autoplay/mic.** Vapi needs a user gesture. The FAB tap is that gesture. Never auto-start a call.

---

## 12. Workstreams

Assign one agent per stream. **WS-A must land `lib/types.ts`, `lib/profile.ts`, and `lib/ProfileContext.tsx` before B/C/D start** — everything else can run in parallel.

| WS | Owner scope | Deliverables | Blocks | Blocked by |
|---|---|---|---|---|
| **A — Shell & State** | `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `app/manifest.ts`, `lib/types.ts`, `lib/profile.ts`, `lib/ProfileContext.tsx`, `components/ui/*`, icons | Types frozen, provider, routing between onboarding/feed, toast host, DebugBar, PWA meta, theme tokens | B, C, D, F | — |
| **B — Onboarding** | `components/onboarding/*`, `public/seed/*` | 5-card swipe deck, tap buttons, DNA-building beat, progress dots | — | A (types + context) |
| **C — Feed** | `components/feed/*` | Snap-scroll feed, infinite loader, product slide, epoch flush, skeleton | — | A (types + context), E (API shape only — mock until ready) |
| **D — Voice** | `lib/vapi.ts`, `components/voice/*` | Vapi client, assistant + tool config, mic FAB state machine, tool-call handler, transcript overlay, 2.5 s client-side fallback shift | — | A, E (`/api/vibe`) |
| **E — Data** | `app/api/feed/route.ts`, `app/api/vibe/route.ts`, `lib/serpapi.ts`, `lib/query.ts`, `lib/env.ts`, `data/fallback_feed.json`, `.env.local.example` | Both routes returning valid shapes with SerpApi + LLM + fallbacks, curated 30-item JSON | C, D | A (types) |
| **F — Push & Ops** | `public/OneSignalSDKWorker.js`, OneSignal init in layout, `app/api/notify/route.ts`, `/trigger` page, deploy | Working push on the demo phone, trigger button, Vercel env vars set | — | A (layout) |

### Mocking contract (unblocks C and D before E lands)
Until `/api/feed` exists, `Feed.tsx` may import `data/fallback_feed.json` directly behind a `USE_MOCK` const. Until `/api/vibe` exists, `handleShift` may call the rules-based path inline. Both must be swapped to the real routes before integration.

---

## 13. Build Order & Time Budget

Assume ~6 working hours.

| Phase | Duration | Content | Gate |
|---|---|---|---|
| 0 | 20 min | WS-A lands types + context + globals + layout. Everyone pulls. `pnpm add motion @vapi-ai/web @anthropic-ai/sdk` | `pnpm dev` boots, `pnpm build` passes |
| 1 | 90 min | B, C, E, F in parallel. C uses mocks. | Feed scrolls with fallback data; deck completes and writes DNA |
| 2 | 60 min | E wires SerpApi live; C swaps to `/api/feed` | Real products render on the phone |
| 3 | 90 min | D: Vapi call connects, tool fires, feed flushes | Say the demo line → feed changes |
| 4 | 45 min | Polish: transitions, toast, safe areas, skeleton, DebugBar | Looks good on the actual demo phone |
| 5 | 45 min | F: push on device. Full run-through ×3, timed. | Under 2:00 with 15 s slack |

**Hard cutoff:** if voice isn't working by the end of Phase 3, ship the DebugBar as the interaction and present it as "typed for demo reliability, voice is the same code path." Do not burn Phase 4/5 on Vapi.

---

## 14. Demo Runbook

Pre-flight (do this the night before, on the demo phone, on venue WiFi if possible):
- [ ] App installed to Home Screen; opens without Safari chrome
- [ ] Push permission granted; test notification received
- [ ] `clearProfile()` run so onboarding shows (add a long-press-logo reset)
- [ ] Mic permission pre-granted
- [ ] Airplane-mode test: fallback feed still renders
- [ ] `FORCE_FALLBACK=1` deploy on a second Vercel URL as the panic button
- [ ] Phone: Do Not Disturb ON except OneSignal; brightness max; auto-lock off

Run of show:
| t | Action | Failure mode → recovery |
|---|---|---|
| 0:00 | Open app, swipe 5 cards (right on desk + outdoor, left on RGB) | Swipe misses → use LIKE/NOPE buttons |
| 0:25 | Scroll 4–5 slides | Slow load → skeleton covers it; keep talking |
| 0:55 | Tap mic, say the Squamish line | No connect → open `?debug=1`, type it |
| 1:15 | Feed flushes; olive rain jacket | Wrong item → scroll one; fallback ranking guarantees it's top-3 |
| 1:30 | Tap Buy Now, show merchant page | Slow → don't wait, close and continue |
| 1:45 | Close app, closing line | — |
| 1:50 | Teammate hits `/trigger` on laptop | No banner → have the screen recording queued |

---

## 15. Definition of Done

- [ ] `pnpm build` passes with zero TypeScript errors
- [ ] Cold load → onboarding → feed in under 30 s on 4G
- [ ] `/api/feed` returns ≥12 items in <2.5 s p95 with SerpApi live; <150 ms with fallback
- [ ] `/api/feed` and `/api/vibe` **never** return a non-2xx
- [ ] Killing network mid-scroll does not blank the feed
- [ ] Voice shift → visible feed change in <3 s from end of utterance
- [ ] DebugBar reproduces every voice behavior
- [ ] No secret appears in the client bundle (`grep -r "SERPAPI\|sk-ant" .next/static` returns nothing)
- [ ] Runs full-screen from the iOS Home Screen with correct safe areas
- [ ] Full demo executed end-to-end 3× under 2:00
