# HAPA — Full Implementation Spec

**The AI DJ for Shopping.** HAPA is an authenticated, voice-steerable shopping feed that learns a shopper's vibe from an optional profile photo plus five explicit “This you?” decisions. When the shopper taps **Buy Now**, an AI agent prepares a supported checkout, resolves missing details, shows the exact order, and waits for both shopper confirmation and payment-provider authorization.

This document is the implementation source of truth. The stakeholder requirements live in `specs/001-voice-shopping-feed/spec.md`; this file defines how the current product is built. Shared contracts live in §4, persistence in §5, and server boundaries in §6–§8. Any workstream that changes those contracts updates these sections first.

---

## 1. Product Journey

The first-run path is fixed:

1. **Sign in** — email magic link/OTP or configured OAuth provider.
2. **Profile** — required display name; optional JPG/PNG/WebP photo with preview, replace, remove, and consent copy.
3. **“This you?”** — exactly five swipeable category/style suggestions. Use photo-derived shopping signals when analysis succeeds; otherwise use five generic suggestions. Right/LIKE accepts; left/NOPE rejects.
4. **Billing readiness** — show Apple Pay, Google Pay, PayPal, Affirm, and configured alternatives as `Available`, `Setup required`, or `Unavailable`. Let the shopper choose a preference or defer setup.
5. **Feed** — immediately enter the full-screen swipe/scroll product feed.
6. **Voice pivot** — spoken or debug-text direction replaces the active category and flushes the feed.
7. **Agent Buy Now** — for supported offers, prepare variant, quantity, shipping, tax, total, and eligible payment methods; ask questions instead of guessing.
8. **Review and authorize** — show an immutable order summary, require explicit HAPA confirmation, then open the selected provider's wallet, redirect, or financing authorization.
9. **Order result** — show only a verified `confirmed`, `canceled`, `declined`, `pending`, `failed`, or `unknown` result. Never infer success from navigation or elapsed time.

Returning users with completed onboarding go from a valid session directly to the feed. Signed-out users never receive private profile, photo, billing-readiness, checkout, or order data.

---

## 2. Constraints & Decisions

| Decision | Choice | Why |
|---|---|---|
| Framework | **Next.js 16.3 App Router** | Already installed. Read the matching `node_modules/next/dist/docs/` guide before implementing routes, proxy/auth boundaries, layouts, metadata, or server actions. |
| Package manager | **pnpm 11** | Lockfile and `packageManager` are present. Never create an npm lockfile. |
| Styling | Tailwind CSS v4 with CSS `@theme` tokens | Already configured; no `tailwind.config.js`. |
| Animation | `motion`, imported from `motion/react` | Swipe deck, feed reset, checkout sheet, and toasts. |
| Identity, DB, storage | **Supabase Auth + Postgres + private Storage**, using `@supabase/ssr` and `@supabase/supabase-js` | One maintained service covers cookie sessions, relational state, row-level ownership, and private profile media. |
| Sign-in methods | Email magic link/OTP plus optional Google OAuth | Low-friction mobile login. Authentication fails closed; the demo uses a pre-authenticated account if email delivery is risky. |
| Profile photo | Private bucket, max 10 MB, JPG/PNG/WebP, server-validated | Photo is optional personal data and must never be public by default. |
| Photo analysis | Groq vision with `qwen/qwen3.6-27b`; JSON-mode output validated server-side | Current Groq production vision path. Failure produces generic suggestions. Model ID remains configurable because provider catalogs change. |
| Photo policy | Shopping cues only; no identity, face recognition, biometrics, or sensitive-trait inference | The image narrows taste; it does not classify the person. |
| Product data | SerpApi for live discovery plus a HAPA-managed demo catalog | SerpApi products are external handoffs unless a seller connector supplies an order contract. Managed demo items can exercise real test-mode checkout. |
| Preference model | Account-backed `StyleDNA`; local cache is non-authoritative | Login and cross-device continuity invalidate the old localStorage-only design. |
| Text interpretation | Groq `openai/gpt-oss-20b` structured output with deterministic fallback | Fast strict JSON for voice/text vibe changes. |
| Voice | `@vapi-ai/web`, client-side, with dashboard-verified model | Vapi needs a user gesture and microphone permission. Do not depend on Groq models scheduled for retirement. |
| Payments | **Stripe Checkout Sessions + Elements**; Express Checkout for Apple Pay/Google Pay/eligible wallets, Payment Element or redirect for Affirm/other methods | Provider handles tokenization, authentication, regional eligibility, 3DS, and wallet UI. HAPA never stores raw credentials. |
| PayPal | Surface through the configured payment provider when merchant region and account are eligible; otherwise show `Unavailable` or add a future direct adapter | PayPal eligibility varies by merchant region and marketplace setup. Do not promise universal availability. |
| Agent checkout | Server-controlled checkout state machine, not browser automation | The agent may prepare supported carts, but cannot safely automate arbitrary merchant websites. |
| Agentic protocols | Future connector boundary for UCP/ACP or seller APIs; not a launch dependency | General agent-platform checkout remains gated/limited. The MVP uses HAPA-managed or explicitly integrated offers. |
| PWA | Native `app/manifest.ts`; standalone only | No service worker, offline payment, background purchase, or push notification. |
| Deploy | Vercel | Auth callback, webhook, environment, and domain registration must be configured per environment. |

### Non-negotiable safety and demo rules

1. **A shopper authorizes every purchase twice where required:** once on HAPA's exact order review, then again in the payment provider's sheet/redirect/financing flow.
2. **The agent never guesses order-affecting values.** Missing size, color, quantity, shipping destination, or substitution requires shopper input.
3. **Authentication and payments fail closed.** No demo fallback may fabricate a user, order, wallet, charge, or successful state.
4. **Non-financial network paths have fallbacks.** Photo analysis → generic suggestions; product discovery → curated catalog; LLM vibe parsing → rules; voice → text debug bar.
5. **The feed never renders empty.** Keep prior items on refresh failure and toast a recovery message.
6. **Payment operations are idempotent.** Repeated clicks, retries, callback replays, reloads, and back navigation cannot create another order or charge.
7. **Photo processing is consented and reversible.** Private storage, short-lived access, visible source explanation, delete support, and safety validation are required.
8. **Never log secrets or raw personal/payment payloads.** Structured logs use IDs and redacted error metadata.

---

## 3. Target File Tree

```text
hapa/
├── app/
│   ├── layout.tsx
│   ├── globals.css
│   ├── manifest.ts
│   ├── page.tsx                         # server gate: login/onboarding/feed
│   ├── auth/
│   │   ├── login/page.tsx
│   │   └── callback/route.ts
│   ├── onboarding/
│   │   ├── profile/page.tsx
│   │   ├── this-you/page.tsx
│   │   └── billing/page.tsx
│   ├── checkout/[checkoutId]/page.tsx
│   ├── orders/[orderId]/page.tsx
│   └── api/
│       ├── profile/route.ts
│       ├── profile/photo/route.ts
│       ├── profile/analyze/route.ts
│       ├── suggestions/decide/route.ts
│       ├── billing/readiness/route.ts
│       ├── feed/route.ts
│       ├── vibe/route.ts
│       ├── checkout/prepare/route.ts
│       ├── checkout/[checkoutId]/confirm/route.ts
│       ├── checkout/[checkoutId]/status/route.ts
│       └── webhooks/stripe/route.ts
├── components/
│   ├── auth/LoginForm.tsx
│   ├── onboarding/ProfileSetup.tsx
│   ├── onboarding/ThisYouDeck.tsx
│   ├── onboarding/SuggestionCard.tsx
│   ├── onboarding/genericSuggestions.ts
│   ├── billing/BillingReadiness.tsx
│   ├── billing/PaymentMethodRow.tsx
│   ├── feed/Feed.tsx
│   ├── feed/ProductSlide.tsx
│   ├── feed/FeedSkeleton.tsx
│   ├── checkout/AgentCheckoutSheet.tsx
│   ├── checkout/CheckoutReview.tsx
│   ├── checkout/PaymentOptions.tsx
│   ├── checkout/OrderStatus.tsx
│   ├── voice/MicButton.tsx
│   ├── voice/TranscriptOverlay.tsx
│   └── ui/{Toast,DebugBar,Avatar,Progress}.tsx
├── lib/
│   ├── types.ts
│   ├── env.ts
│   ├── supabase/{client,server,admin}.ts
│   ├── auth.ts
│   ├── profile.ts
│   ├── photo.ts
│   ├── photo-analysis.ts
│   ├── suggestions.ts
│   ├── query.ts
│   ├── serpapi.ts
│   ├── fallback.ts
│   ├── vapi.ts
│   ├── payments/{stripe,readiness}.ts
│   ├── checkout/{prepare,confirm,reconcile}.ts
│   └── orders.ts
├── data/
│   ├── fallback_feed.json               # ≥30 items
│   └── demo_catalog.json                # supported test-checkout offers
├── public/
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── apple-touch-icon.png
│   └── seed/*.jpg
├── supabase/
│   └── migrations/001_hapa_core.sql
├── proxy.ts                             # Supabase SSR session refresh
├── .env.local.example
└── SPEC.md
```

Do not create a public avatar bucket. The profile image is a private personalization input, even if displayed back to its owner.

---

## 4. Shared Contracts — `lib/types.ts`

Write and freeze this file before dependent UI/API work.

```ts
export type OnboardingStage =
  | 'profile'
  | 'photo_processing'
  | 'this_you'
  | 'billing'
  | 'complete';

export type SuggestionSource = 'photo' | 'generic';

export interface StyleDNA {
  version: 2;
  affinities: Record<string, number>;
  dealbreakers: string[];
  categories: string[];
  context: string | null;
  priceCeiling: number | null;
  updatedAt: number;
}

export interface ShopperProfile {
  userId: string;
  name: string;
  photoPath: string | null;       // private storage path, never a permanent public URL
  photoVersion: number;
  onboardingStage: OnboardingStage;
  style: StyleDNA;
  preferredPaymentMethod: PaymentMethodKind | null;
  createdAt: string;
  updatedAt: string;
}

export interface StyleSuggestion {
  id: string;
  source: SuggestionSource;
  label: string;
  caption: string;
  image: string;                  // generated/curated visual, not necessarily the profile photo
  categories: string[];
  affinities: string[];
  rejectAsDealbreakers: string[]; // first two strongest signals
  confidence: number | null;
}

export interface PhotoAnalysis {
  id: string;
  photoVersion: number;
  status: 'pending' | 'complete' | 'fallback' | 'rejected';
  suggestions: StyleSuggestion[]; // exactly five after fallback normalization
  reason: string | null;
  createdAt: string;
}

export interface VibeShift {
  addAffinities?: string[];
  removeAffinities?: string[];
  addDealbreakers?: string[];
  removeDealbreakers?: string[];
  setCategories?: string[];
  setContext?: string | null;
  setPriceCeiling?: number | null;
  label: string;
}

export type CheckoutMode = 'hapa' | 'external';

export interface ProductVariant {
  id: string;
  label: string;
  available: boolean;
  attributes: Record<string, string>; // e.g. { size: 'M', color: 'Olive' }
}

export interface ProductCard {
  id: string;
  title: string;
  price: string;
  extractedPrice: number | null;
  currency: string;
  source: string;
  thumbnail: string;
  link: string;
  rating: number | null;
  reviews: number | null;
  delivery: string | null;
  tags: string[];
  checkoutMode: CheckoutMode;
  offerId: string | null;         // server-resolvable supported offer
  variants: ProductVariant[];
}

export type PaymentMethodKind =
  | 'apple_pay'
  | 'google_pay'
  | 'paypal'
  | 'affirm'
  | 'card';

export type PaymentReadinessStatus =
  | 'available'
  | 'setup_required'
  | 'unavailable';

export interface PaymentMethodReadiness {
  method: PaymentMethodKind;
  status: PaymentReadinessStatus;
  reason: string | null;
  provider: 'stripe' | 'paypal';
  checkedAt: string;
}

export interface Money {
  amount: number;                 // integer minor units
  currency: string;               // lowercase ISO currency code
}

export interface ShippingAddress {
  name: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string;
  postalCode: string;
  country: string;
}

export type CheckoutStatus =
  | 'gathering'
  | 'ready_for_review'
  | 'confirmed'
  | 'payment_pending'
  | 'paid'
  | 'canceled'
  | 'declined'
  | 'failed'
  | 'unknown';

export interface CheckoutReview {
  reviewVersion: number;
  productId: string;
  offerId: string;
  merchant: string;
  title: string;
  thumbnail: string;
  variant: Record<string, string>;
  quantity: number;
  subtotal: Money;
  discount: Money;
  shipping: Money;
  tax: Money;
  total: Money;
  shippingAddress: ShippingAddress;
  paymentMethod: PaymentMethodKind;
  expiresAt: string;
}

export interface CheckoutSession {
  id: string;
  userId: string;
  status: CheckoutStatus;
  review: CheckoutReview | null;
  missingFields: string[];
  eligiblePaymentMethods: PaymentMethodReadiness[];
  providerSessionSecret: string | null; // returned only to the owning client when needed
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  userId: string;
  checkoutId: string;
  status: Exclude<CheckoutStatus, 'gathering' | 'ready_for_review'>;
  review: CheckoutReview;
  merchantOrderId: string | null;
  paymentReference: string | null;
  receiptUrl: string | null;
  createdAt: string;
  updatedAt: string;
}
```

API contracts also live in `lib/types.ts`:

```ts
export interface FeedRequest {
  profile?: StyleDNA;             // server ignores foreign user data; defaults to auth profile
  page: number;
  pageSize?: number;
  seen?: string[];
}

export interface FeedResponse {
  items: ProductCard[];
  query: string;
  source: 'serpapi' | 'fallback' | 'demo';
  hasMore: boolean;
}

export interface CheckoutPrepareRequest {
  productId: string;
  offerId: string;
  variantId?: string;
  quantity?: number;
  shippingAddress?: ShippingAddress;
  paymentMethod?: PaymentMethodKind;
}

export interface CheckoutConfirmRequest {
  checkoutId: string;
  reviewVersion: number;
  idempotencyKey: string;
  confirmed: true;
}
```

---

## 5. Authenticated Persistence

### 5.1 Supabase clients and session boundary

- `lib/supabase/client.ts`: `createBrowserClient` for client-owned operations.
- `lib/supabase/server.ts`: create a new cookie-aware server client **inside every request/render**, never at module scope.
- `lib/supabase/admin.ts`: service-role client for trusted webhook/reconciliation paths only; import from server-only files.
- `proxy.ts`: refresh sessions according to the installed Next.js 16 and current `@supabase/ssr` guidance.
- Authenticated responses are private/no-store. Never cache a response that writes session cookies.
- All API routes call `requireUser()` and derive `userId` from the verified session, never from the request body.

### 5.2 Tables and ownership

`supabase/migrations/001_hapa_core.sql` creates:

| Table | Key fields | Ownership/security |
|---|---|---|
| `profiles` | `user_id`, `name`, `photo_path`, `photo_version`, `onboarding_stage`, `preferred_payment_method` | One row per authenticated user; RLS `user_id = auth.uid()` |
| `style_profiles` | `user_id`, `version`, `affinities`, `dealbreakers`, `categories`, `context`, `price_ceiling`, `updated_at` | User-owned; server validates shape and caps weights |
| `photo_analyses` | `id`, `user_id`, `photo_version`, `status`, `suggestions`, `reason` | User-owned; latest matching photo version is active |
| `suggestion_decisions` | `id`, `user_id`, `analysis_id`, `suggestion_id`, `decision`, `applied_shift` | Unique per analysis/suggestion; explicit signals only |
| `payment_preferences` | `user_id`, `method`, `provider`, `provider_customer_ref`, `is_preferred`, `last_checked_at` | Safe references only; no raw payment credentials |
| `checkout_sessions` | `id`, `user_id`, `offer_id`, `status`, `review`, `review_version`, `idempotency_key`, provider refs | User can read own rows; writes only through trusted server paths |
| `orders` | `id`, `user_id`, `checkout_id`, `status`, immutable review, merchant/payment refs, receipt URL | User reads own; webhook/reconciliation paths update status |
| `webhook_events` | provider event ID, type, payload hash, processed timestamp | Service-role only; unique event ID blocks replay |

Enable RLS on every user table. Add foreign keys to `auth.users(id)` with appropriate delete behavior. Account deletion removes profile/photo/style data and follows the documented retention policy for legally required financial records.

### 5.3 Private photo storage

- Bucket: `profile-photos`, private.
- Object path: `{userId}/{photoVersion}/original.{ext}`.
- Allowed types: `image/jpeg`, `image/png`, `image/webp`; max 10 MB.
- Verify MIME from decoded bytes server-side; do not trust filename or browser type alone.
- Strip metadata and create a normalized analysis copy before third-party processing.
- Use a signed URL of at most 60 seconds for the vision request. Consent copy states that a configured AI provider processes the image.
- The client receives a short-lived signed display URL, never the storage path of another user.
- Replacing/deleting a photo invalidates the active version, deletes old objects, and prevents late analysis results from attaching.

### 5.4 Style state

`StyleDNA.version` becomes `2`. Server persistence is authoritative. React context may optimistically apply a validated `VibeShift`, but it writes through to `/api/profile` and reconciles on failure. localStorage may hold only a non-sensitive last-viewed slide or dismissed UI hints; it never defines identity, onboarding, style, checkout, or orders.

`applyShift` retains the existing rules:

- normalize lowercase trimmed terms;
- add affinities by `+1`, capped at `5`;
- remove affinities by deleting the key;
- added dealbreakers are unioned/deduped and delete the same affinity;
- `setCategories` replaces rather than merges;
- every applied shift records provenance (`photo`, `suggestion`, `voice`, `text`, or `manual`) and bumps `updatedAt`.

---

## 6. Profile, Photo Analysis, and Suggestions API

### 6.1 `GET/PATCH /api/profile`

- Requires authentication.
- `GET` returns the owner profile and active StyleDNA.
- `PATCH` accepts display name, onboarding progression, preferred payment method, or a validated style shift.
- Names are trimmed, 1–80 visible characters, and rendered as text only.
- The server enforces allowed onboarding transitions; clients cannot skip required profile and suggestion decisions by sending `complete`.

### 6.2 `POST/DELETE /api/profile/photo`

`POST` accepts one validated image, increments `photoVersion`, stores it privately, sets stage to `photo_processing`, and returns a safe preview URL plus analysis job/result status. `DELETE` removes all owned photo objects, clears `photoPath`, invalidates in-flight analysis, and removes unconfirmed photo-derived suggestions.

For the demo, analysis may run in the request with a hard 5-second budget. If it is not complete, write a `fallback` analysis containing generic suggestions and proceed. A late result for an old photo version is discarded.

### 6.3 `POST /api/profile/analyze`

Inputs are taken from the authenticated profile photo; the route never accepts an arbitrary remote image URL. Flow:

1. Load the current `photoVersion` and private object.
2. Normalize/strip metadata; reject unsupported or unsafe content.
3. Create a 60-second signed URL and send it with this policy prompt:

```text
Generate shopping-style suggestions from visible clothing, accessories, materials,
colors, silhouettes, and decor only. Do not identify any person. Do not infer or mention
age, gender identity, race, ethnicity, nationality, religion, disability, health,
sexuality, income, or other sensitive traits. Treat every output as a suggestion the
shopper must confirm.

Return exactly five varied, concrete shoppable categories. Each item needs a short label,
caption, 1-2 categories, 2-5 affinities, and the two strongest rejection attributes.
```

4. Use `qwen/qwen3.6-27b` with JSON mode and a server-side schema validator. Model ID comes from `PHOTO_MODEL`.
5. Reject output containing prohibited sensitive terms, fewer/more than five unique suggestions, vague non-shopping categories, or invalid shape.
6. On error, timeout, refusal, or low-quality result, store the five generic suggestions and `status: 'fallback'`.
7. Persist only the normalized suggestions and safety outcome; never persist hidden model reasoning.

### 6.4 `POST /api/suggestions/decide`

Body: `{ analysisId, suggestionId, decision: 'like' | 'nope' }`.

- Unique constraint makes the decision idempotent.
- Like: set categories from the suggestion and add its affinities.
- Nope: add the two `rejectAsDealbreakers`; do not set categories.
- After exactly five decisions for the active analysis, store the resulting StyleDNA, set onboarding stage to `billing`, and return a short style summary.
- The API rejects decisions for another user, stale photo version, or unknown suggestion.

---

## 7. Billing Readiness and Payments

### 7.1 What the billing page means

The page does **not** preload or store wallet credentials. It tells the shopper what HAPA can offer and which methods need provider setup.

Status inputs:

- **Server:** merchant account activation, country, currency, configured provider methods, known shopper country, and saved safe references.
- **Client:** browser/device capability and wallet availability reported by the provider element.
- **Order time:** merchant, total, currency, category, shipping country, and financing thresholds.

Onboarding readiness is provisional. Checkout recomputes it for the exact order.

### 7.2 `GET /api/billing/readiness`

Returns all configured `PaymentMethodReadiness` entries. Always include Apple Pay, Google Pay, PayPal, Affirm, and card in a stable display order, even when a method is unavailable. Never claim Apple Pay/Google Pay availability until client capability is known. The UI merges the provider element's `ready` event into the server result.

Examples:

| Method | Available when | Setup/Unavailable behavior |
|---|---|---|
| Apple Pay | Supported device/browser, active Wallet card, registered domain, eligible currency/merchant | Show setup guidance or unavailable reason; authorization remains Face ID/Touch ID/passcode/device action |
| Google Pay | Supported browser/device/account, configured gateway, eligible currency/merchant | Open Google payment sheet; token only returns after user approval |
| PayPal | Merchant account/region enabled and order eligible | Redirect/account authentication; unavailable when provider or marketplace approval is missing |
| Affirm | Eligible merchant/shopper country, currency, category, and order range | Presented at exact checkout; shopper chooses plan and accepts financing terms on provider flow |
| Card | Provider card acceptance is enabled | Payment Element handles details and required authentication; HAPA never receives raw card data |

### 7.3 Provider integration

Install `stripe`, `@stripe/stripe-js`, and `@stripe/react-stripe-js`.

- Stripe Customer ID is stored server-side in `payment_preferences`.
- Use Checkout Sessions in custom/embedded UI mode so server owns line items, shipping options, taxes, and payment state.
- Express Checkout Element surfaces eligible Apple Pay, Google Pay, and PayPal buttons.
- Payment Element/Checkout handles Affirm and card where eligible.
- Use dynamic payment methods; do not force unsupported methods to render.
- Register each testing/live domain for wallet use.
- PayPal remains conditional on merchant region/account support. A future `payments/paypal.ts` direct adapter may be added without changing checkout contracts.
- Provider client secrets are returned only for the owning checkout and are never logged.

### 7.4 No autonomous settlement

“Agent does everything” means it prepares and validates the order. It does not bypass provider authorization or settle an arbitrary merchant's wallet. Apple Pay and Google Pay require their payment sheets; PayPal and Affirm require their own authentication/approval. HAPA submits the payment only after the shopper confirms the current review version.

---

## 8. Agent-Assisted Checkout and Orders

### 8.1 Eligibility boundary

`ProductCard.checkoutMode` is authoritative:

- `hapa`: the server can resolve `offerId`, verify price/inventory, enumerate variants, compute totals, and create an order through HAPA's demo merchant or an approved seller connector.
- `external`: Buy Now opens the merchant destination with a clear “Checkout continues with {merchant}” label. The agent does not scrape, click through, or enter credentials on arbitrary sites.

SerpApi-normalized items default to `external`. `demo_catalog.json` includes at least six `hapa` test offers across the feed's main vibes. One olive waterproof jacket is the checkout hero item.

### 8.2 `POST /api/checkout/prepare`

Flow:

1. Require the authenticated owner and rate-limit by user.
2. Resolve the product/offer server-side; ignore request prices and merchant names.
3. Verify inventory, live amount, currency, variants, merchant, and checkout capability.
4. Validate quantity (`1–10`) and supplied variant.
5. Resolve shipping from request/provider data. If any order-affecting value is missing, return `status: gathering` and `missingFields`; do not guess.
6. Calculate subtotal, discount, shipping, tax, and total server-side.
7. Compute exact-order payment eligibility.
8. Write a versioned immutable `CheckoutReview` with a short expiry (10 minutes).
9. Return `ready_for_review`; do **not** create a payable provider session yet if the shopper has not confirmed.

The optional language model may translate conversational answers into candidate variant IDs, but the server validates them against the offer and echoes them in the review. A model never calculates or overrides money.

### 8.3 Checkout review UI

`AgentCheckoutSheet` is a bottom sheet over the feed with states:

```text
preparing -> needs_input -> ready_for_review -> authorizing
          -> pending -> paid | canceled | declined | failed | unknown
```

The review must show:

- item image/title and merchant;
- size/color/other variant and quantity;
- subtotal, discount, shipping, tax, and bold total;
- delivery name and full address;
- selected payment method and currently eligible alternatives;
- “Confirm and pay {total}” and Cancel actions;
- a note that the selected provider will request its own authorization.

Any price, tax, shipping, address, variant, quantity, or payment-method change increments `reviewVersion`, invalidates the previous confirmation, and changes the button total.

### 8.4 `POST /api/checkout/[checkoutId]/confirm`

The request must include `confirmed: true`, the exact `reviewVersion`, and a client-generated idempotency key.

Server rules:

1. Lock/read the owner checkout.
2. Reject expired, stale-version, non-owned, already-terminal, or non-reviewable sessions.
3. Re-resolve the offer and totals. If anything changed, write a new review and return `409 REVIEW_CHANGED`; the shopper must confirm again.
4. Atomically persist the idempotency key and `confirmed` state.
5. Create/reuse the provider Checkout Session with the same server idempotency key.
6. Return only the provider data required to open the eligible payment UI.
7. Do not mark the order paid from the client response.

### 8.5 Wallet/provider authorization

- Apple Pay/Google Pay: mount the provider's express element, show its sheet, collect address where configured, and let the user authorize. HAPA never receives raw wallet credentials.
- PayPal: redirect/authenticate and return through the provider flow when eligible.
- Affirm: redirect or embedded provider flow; the shopper chooses/accepts terms. Never preselect financing or imply approval.
- Card: provider-hosted fields plus required authentication.

Cancellation returns checkout to `canceled` or `ready_for_review` according to provider semantics. Do not auto-reopen a payment sheet without a new user gesture.

### 8.6 Webhook and reconciliation

`POST /api/webhooks/stripe`:

- read the raw body and verify the webhook signature;
- insert provider event ID into `webhook_events` before processing;
- ignore/replay-safe duplicate events;
- map provider status to HAPA checkout/order state;
- create exactly one order per checkout using a unique `checkout_id`;
- store provider IDs, not raw payment data;
- return `2xx` only after durable processing or safe duplicate recognition.

`GET /api/checkout/[checkoutId]/status` returns the persisted state. If the client lost connection, `reconcile.ts` fetches the provider state server-side. Unknown remains unknown until verified; never ask the shopper to pay again while a prior payment may have succeeded.

For “payment succeeded, order creation failed,” create an incident state and run the supported merchant void/refund/recovery path. The UI says “Payment received — resolving your order” and exposes support/reference information; it does not claim fulfillment.

---

## 9. Product Feed and Vibe APIs

### 9.1 `POST /api/feed`

Requires auth and loads the owner's StyleDNA. The request may carry an optimistic profile, but the server never accepts a foreign `userId` and may ignore inconsistent client state.

Flow:

1. Build query from top three affinities, active categories, context, and negative dealbreakers; cap 120 chars.
2. Blend pinned HAPA demo offers into page 1 so at least one supported checkout item is discoverable.
3. If no SerpApi key or `FORCE_FALLBACK=1`, use curated data.
4. Fetch SerpApi with a 6-second timeout; normalize results as `checkoutMode: external`.
5. Drop missing title/image/link, dealbreaker matches, and `seen` IDs.
6. If fewer than four live items remain, use fallback.
7. Return up to `pageSize` (default 12) and never a blank first page.

`data/fallback_feed.json` still contains at least 30 tagged items: minimalist desk/tech, outdoor/camping/rain, streetwear, and gaming/RGB negative controls. `data/demo_catalog.json` contains current test prices, currency, variants, stock, provider price references, and checkout mode. The olive waterproof rain jacket ranks first for `camping + waterproof` and supports test checkout.

### 9.2 `POST /api/vibe`

Requires auth. Input: current profile, `newKeywords`, `dealbreakers`, optional raw utterance. Use `openai/gpt-oss-20b` strict structured outputs and a 5-second maximum. On failure, rules produce:

- `setCategories`: up to three concrete short keywords;
- `addAffinities`: up to five keywords;
- `addDealbreakers`: explicit negatives;
- concise `label` and deterministic query.

Persist the accepted shift with provenance before returning. The client may apply the same deterministic shift at 2.5 seconds for visual timing; use a request ID so a late server result cannot apply twice.

### 9.3 Feed client

- Full-screen `100dvh`, vertical mandatory scroll-snap.
- Reset items/page/scroll position once when the authenticated profile epoch changes.
- IntersectionObserver loads three slides before the end; guard duplicate loads.
- Preserve existing items on failure and retry once after 1.5 seconds.
- Prefetch the next product image.
- Every slide displays checkout capability. Button labels:
  - `Buy with HAPA` for `checkoutMode: hapa`;
  - `Buy at {merchant}` for `checkoutMode: external`.
- The button reserves safe-area space and never collides with the microphone FAB.

---

## 10. Onboarding UI

### 10.1 Login

- Dark full-screen HAPA mark and one-sentence value proposition.
- Email magic link/OTP is primary; configured OAuth buttons follow.
- Show explicit loading, sent, expired, and retry states.
- Do not disclose whether an email exists.
- Callback verifies the exchange and redirects according to persisted onboarding stage.
- Demo preflight signs in ahead of time; there is no authentication bypass.

### 10.2 Profile setup

- Required name field.
- Optional circular photo drop/tap area with camera/library picker on mobile.
- Copy: “Optional. We use visible style cues—not identity or sensitive traits—to suggest your starting vibe.”
- Preview, Replace, Remove, Continue without photo.
- Consent checkbox is required only when a photo is submitted and links to the photo processing/deletion explanation.
- Upload progress is visible. Analysis lasts at most five seconds before generic fallback.

### 10.3 “This you?” deck

Header: **This you?** Subhead: **Five quick calls. You stay in control.**

- Exactly five cards from the active analysis.
- Photo-derived cards visually use curated category art; do not crop the personal photo into every card.
- Top card draggable; two below visible at smaller scale/offset.
- Commit threshold: `|offset.x| > 110 || |velocity.x| > 500`.
- Like/Nope buttons and Left/Right keyboard paths call the same idempotent decision action.
- Green/red overlay, accessible labels, progress `1/5`.
- After choice five, show up to 700 ms of “Locking in your vibe…” and the accepted categories, then navigate to billing.

Generic suggestions remain the existing five buckets: streetwear, minimalist desk, gaming, vintage leather, and trail gear. They are shuffled but stable for one analysis.

### 10.4 Billing readiness

Title: **How do you want HAPA to pay?** Subhead: **We'll prepare the order. You always approve the total.**

- Rows for Apple Pay, Google Pay, PayPal, Affirm, and card.
- Each row shows logo, status, short reason, and Setup/Preferred/Unavailable action.
- Browser/provider readiness updates rows without layout shift.
- Apple Pay and Google Pay are never marked available solely because a server setting is enabled.
- “Set up later” is always available and does not block shopping.
- Continue label: **Start swiping**.

---

## 11. Voice

Use `@vapi-ai/web` only after a user taps the mic. State machine: `idle -> connecting -> listening -> speaking -> idle`.

The assistant prompt includes the authenticated first name and current StyleDNA but never profile-photo URLs, payment references, full shipping addresses, or order history. It may steer the feed and help gather checkout choices, but it cannot confirm a purchase on the shopper's behalf.

Tool boundaries:

- `shift_feed_vibe`: may apply categories, affinities, context, and dealbreakers.
- `answer_checkout_question`: may record a shopper-provided variant/quantity/address choice for the active checkout.
- There is **no** `confirm_purchase` voice tool in the MVP. Financial confirmation is a visible tap on the current review, followed by provider authorization.

Verify the exact conversational model in the Vapi dashboard before implementation. Do not hard-code `llama-3.3-70b-versatile`, which is scheduled for Groq free/developer-tier retirement. Preferred candidates are current Vapi-supported production models; fall back to a supported OpenAI small model without changing tool contracts.

On Vapi error or permission denial, show `DebugBar`. Text steering uses the same vibe endpoint. Checkout remains available through visible controls even when voice fails.

---

## 12. PWA, Visual Design, and Accessibility

### 12.1 PWA

Native `app/manifest.ts`, standalone display, dark theme, icons at 192/512, Apple web-app metadata, and `viewport-fit=cover`. No service worker is required. Offline browsing may show cached shell content, but auth, price verification, and payment are unavailable offline and must say so.

### 12.2 Visual language

```css
@theme {
  --color-bg: #0a0a0a;
  --color-fg: #f5f5f5;
  --color-muted: #a1a1aa;
  --color-accent: #c7f04a;
  --color-danger: #ff5c5c;
  --color-warning: #f5c451;
  --font-display: var(--font-geist-sans);
}
```

- Edge-to-edge, high contrast, acid-lime primary accent.
- Normal transitions 200–280 ms; onboarding beat ≤700 ms.
- Vibe toast: `[Vibe Shift: {label}]`.
- Financial success uses a distinct verified check state; never reuse optimistic vibe styling.
- Checkout total and confirmation action remain visible above the safe area.
- Respect reduced motion. Provide visible focus, labels, status announcements, and non-swipe alternatives.

### 12.3 Image rules

- Arbitrary product thumbnails use plain `<img>` with documented lint suppression.
- Profile photos use authenticated/signed sources only and descriptive alt such as “Your profile photo,” never AI-inferred appearance text.
- Suggestion card alt describes the category artwork, not the shopper.
- Seed assets stay under 300 KB when possible; uploaded profile photos are normalized server-side.

---

## 13. Security, Privacy, and Failure Semantics

### Authentication

- Require verified session for every profile, suggestion, billing, checkout, and order route.
- Derive user ID server-side; test cross-user IDOR attempts.
- Authenticated pages and responses are private/no-store.
- CSRF/origin protections follow current provider and Next.js guidance for state-changing routes.
- Rate-limit sign-in, photo analysis, vibe, checkout preparation, and confirmation.

### Photo privacy

- Private bucket and owner RLS.
- Signed URLs ≤60 seconds for analysis/display use appropriate to context.
- Consent records photo processing purpose and policy version.
- No face recognition, biometric template, identity, or sensitive inference.
- Delete removes the object and invalidates current photo version. Document any backup/provider retention that cannot be immediate.
- Logs contain analysis ID and status only, never the signed URL or image bytes.

### Payments and orders

- Raw card/wallet credentials never touch HAPA servers.
- Verify webhook signatures from raw request bytes.
- Use provider and database idempotency keys plus unique constraints.
- Store all money as integer minor units with explicit currency.
- Never trust price, tax, shipping, merchant, offer, or payment status from the client.
- Review expires after 10 minutes and any change forces reconfirmation.
- The final payment provider sheet cannot be triggered without a fresh user gesture where required.
- Financial operations have honest states; timeouts yield `pending` or `unknown`, never fallback success.

### External services

- SerpApi 6-second timeout; Groq text 5 seconds; photo analysis 5 seconds before generic fallback.
- Payment and auth use provider-specific timeouts/retries and reconciliation, not the eight-second demo fallback rule.
- Circuit-break repeated non-financial failures and keep the last useful feed.
- Provider secrets and service-role keys are server-only.

---

## 14. Environment

`.env.local.example`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

SERPAPI_KEY=
GROQ_API_KEY=
PHOTO_MODEL=qwen/qwen3.6-27b
VIBE_MODEL=openai/gpt-oss-20b
FORCE_FALLBACK=0
NEXT_PUBLIC_VAPI_PUBLIC_KEY=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

APP_URL=http://localhost:3000
PAYMENTS_MODE=test
```

Do not put service-role, Stripe secret, webhook secret, SerpApi, or Groq values in `NEXT_PUBLIC_*`. `PAYMENTS_MODE=live` is a production-only explicit configuration and never enabled for local/demo builds by accident.

---

## 15. Workstreams

| WS | Scope | Deliverables | Blocked by |
|---|---|---|---|
| **A — Contracts, Auth, DB** | `lib/types.ts`, Supabase utilities, proxy, migration, auth pages/callback | Frozen contracts, secure session, RLS, profile rows | — |
| **B — Profile & Photo** | profile UI, private upload, analysis, suggestions API | Name/photo flow, safe five-suggestion output, generic fallback | A |
| **C — Calibration & Shell** | This You deck, billing page, routing, toasts, PWA | Full onboarding stage machine and accessible swipe paths | A, B; billing contract from G |
| **D — Feed** | feed components, product normalization, infinite loading | Personalized snap feed, checkout capability label, fallback data | A, F |
| **E — Voice** | Vapi client, mic/transcript/debug | Voice/text vibe changes; no financial confirmation tool | A, F |
| **F — Recommendations** | SerpApi, query/vibe routes, fallback/demo catalogs | Live/fallback feed, deterministic vibe path, supported offers blended | A |
| **G — Commerce** | billing readiness, Stripe, checkout state machine, review, webhook, orders | Test-mode Apple/Google/card/Affirm/eligible PayPal, explicit confirmation, idempotency | A, F offer contract |

Mocking rules:

- B may use generic suggestions until photo analysis lands.
- C may use static payment readiness but must display it as mock/test status.
- D uses fallback/demo catalog until F lands.
- G uses Stripe test mode and demo offers; never mock a financial success as a live payment.
- External SerpApi products remain external checkout unless F/G explicitly add a seller contract.

---

## 16. Build Order and Gates

Estimated focused build time: **12–16 hours**, not the previous six-hour scope. Authentication, private media, and safe payments make a six-hour full build unrealistic.

| Phase | Time | Work | Gate |
|---|---:|---|---|
| 0 | 45 min | Read Next 16 docs; install packages; freeze types; create migration/env | Typecheck and migration apply cleanly |
| 1 | 90 min | Auth, session proxy, profile table/UI, stage routing | Sign in/out and owner-only profile access pass |
| 2 | 90 min | Private photo upload, safety prompt, five suggestions, generic fallback | Photo/no-photo paths each yield exactly five suggestions |
| 3 | 60 min | This You deck and billing readiness shell | Five decisions persist; billing can defer; feed opens |
| 4 | 120 min | Feed, fallback/demo catalog, live discovery | Personalized feed never blanks; supported offer visible |
| 5 | 150 min | Checkout prepare/review, Stripe test UI, webhook, order page | Exact review + wallet/provider authorization creates one test order |
| 6 | 90 min | Voice/text steering and feed flush | Spoken demo line changes feed; no voice purchase confirmation |
| 7 | 90 min | Failure drills, accessibility, safe areas, visual polish | Auth/payment fail closed; duplicate tests pass; mobile run succeeds |

Hard cutoffs:

- If photo vision is unreliable after Phase 2, ship generic suggestions and keep photo as a private avatar; do not block onboarding.
- If a wallet is unavailable on the demo device, use Stripe test card for the live run and show wallet readiness accurately; do not fake the wallet button.
- If checkout/webhook is not trustworthy after Phase 5, keep Buy Now as a clearly labeled test-mode review or external handoff; do not claim a completed payment.
- If voice fails, use the tested text bar and preserve the same vibe API.

---

## 17. Test Plan

### Unit

- Style shift normalization, weight caps, exclusion precedence, provenance.
- Generic suggestion normalization to exactly five unique cards.
- Photo output validator rejects sensitive terms and invalid shapes.
- Product dealbreaker filter and fallback ranking.
- Money math uses integer units and currency-safe formatting.
- Checkout transition table rejects invalid and stale transitions.
- Review version and idempotency behavior.
- Provider status mapping preserves pending/unknown.

### Integration

- RLS prevents cross-user profile, photo analysis, checkout, and order access.
- Photo replace/delete invalidates late results.
- Five unique decisions advance onboarding once.
- Billing readiness merges server and client capability honestly.
- Checkout ignores client-supplied price and re-resolves offer.
- Price/variant/address change forces a new confirmation.
- Signed/invalid/duplicate webhook handling.
- Payment success callback replay creates one order.
- Client disconnect after authorization reconciles without another payment.
- External product never enters the HAPA checkout route.

### End-to-end

1. Email/OAuth login → name → skip photo → generic This You → defer billing → feed.
2. Login → upload photo → photo-derived This You → payment preference → feed.
3. Photo analysis timeout → generic deck within five seconds.
4. Voice direction → feed flush → relevant olive rain jacket.
5. Supported Buy with HAPA → resolve size → review → explicit confirm → Stripe test authorization → verified order.
6. Cancel wallet/payment sheet → no order/charge.
7. Double tap/reload/webhook replay → one checkout, one charge, one order.
8. Unsupported product → labeled external merchant handoff.
9. Expired session during checkout → reauth required, no payment submission.
10. Network loss after payment authorization → pending/unknown then reconciled verified result.

Run automated tests with provider test fixtures. Real money and live wallets are never used in CI.

---

## 18. Demo Runbook

Preflight:

- Demo account authenticated; onboarding reset server-side.
- One safe sample photo compressed and ready in Photos.
- Supabase migration/RLS verified; private bucket confirmed.
- Stripe in test mode; domain registered; webhook reachable.
- Record which wallet buttons genuinely appear on the actual device/browser.
- Demo catalog inventory and price stable; olive jacket checkout-enabled.
- SerpApi/Groq/Vapi keys verified; `FORCE_FALLBACK=1` panic deployment ready.
- Test photo fallback, text vibe fallback, payment cancel, and duplicate submission.
- Phone DND on, brightness max, auto-lock off.

Run of show (target **2:30**):

| t | Action | Failure-safe recovery |
|---|---|---|
| 0:00 | Open authenticated app; enter name; upload sample photo | Upload/analysis fails → Continue with generic suggestions |
| 0:20 | “This you?”: accept desk/outdoor, reject RGB across five cards | Swipe misses → use LIKE/NOPE buttons |
| 0:45 | Billing readiness: point out eligible wallet; choose preferred or defer | Wallet absent → state accurately and use test card later |
| 0:58 | Start swiping product feed | Live results slow → curated feed appears |
| 1:20 | Voice: “Camping in Squamish, rain, no neon or RGB” | Voice fails → type same line in debug bar |
| 1:42 | Feed flushes to olive waterproof jacket | Wrong rank → supported item is pinned in top three |
| 1:52 | Tap Buy with HAPA; answer size if asked | Preparation fails → show external/test-mode fallback honestly |
| 2:08 | Review exact total; tap Confirm and pay | Never skip this screen |
| 2:15 | Authorize provider test payment; show verified order | Cancel/failure → narrate honest recovery state |

The presenter never claims HAPA can purchase arbitrary web products. Phrase it as: “For supported sellers, HAPA prepares the whole order; you approve the exact total and your wallet still protects the final payment.”

---

## 19. Definition of Done

- [ ] `pnpm build` passes with zero TypeScript errors.
- [ ] Authenticated routes use current Next.js 16 and Supabase SSR patterns and are private/no-store.
- [ ] Cross-user RLS/IDOR tests fail safely for profile, photos, analysis, checkout, and orders.
- [ ] Name is required; photo is optional, previewable, replaceable, deletable, and private.
- [ ] Photo analysis never outputs identity, biometrics, or sensitive traits; failure yields five generic suggestions within five seconds.
- [ ] “This you?” always presents exactly five accessible, idempotent decisions.
- [ ] Explicit choices, not raw photo analysis, determine confirmed StyleDNA.
- [ ] Billing shows Apple Pay, Google Pay, PayPal, Affirm, and card with truthful readiness.
- [ ] No raw card, wallet, bank, or security-code data reaches HAPA storage or logs.
- [ ] Feed returns at least 12 items, never blanks on refresh failure, and labels checkout capability.
- [ ] SerpApi items default to external checkout; only server-resolvable offers use HAPA checkout.
- [ ] Agent checkout asks for missing order details and never guesses them.
- [ ] Review shows item, variant, merchant, quantity, subtotal, discount, shipping, tax, total, destination, and method.
- [ ] Any review change invalidates confirmation and requires a new explicit tap.
- [ ] Wallet/provider authorization remains present after HAPA confirmation.
- [ ] Payment/order paths are idempotent across repeated clicks, reloads, retries, and webhook replay.
- [ ] Only verified provider/merchant state produces `paid`/confirmed UI.
- [ ] Pending, unknown, canceled, declined, failed, and recovery states are tested.
- [ ] Voice shift changes the visible feed within three seconds; text fallback reproduces it.
- [ ] No voice tool can confirm a purchase in the MVP.
- [ ] Secrets do not appear in `.next/static`; logs contain no signed photo URLs or payment secrets.
- [ ] Home Screen mode and safe areas work on the actual demo phone.
- [ ] The complete 2:30 demo is executed three consecutive times, including one failure recovery.

---

## 20. External Constraints Recorded for Planning

- Apple Pay on the web requires supported devices/regions and user authorization; HAPA cannot bypass the payment sheet: <https://developer.apple.com/documentation/applepayontheweb>
- Google Pay returns a token only after the user selects and approves a method in its payment sheet: <https://developers.google.com/pay/api/web/overview>
- Stripe Express Checkout dynamically presents supported/configured wallet methods by browser, country, currency, and setup: <https://docs.stripe.com/elements/express-checkout-element>
- Affirm eligibility depends on merchant/shopper country, currency, amount, category, and approval: <https://docs.stripe.com/payments/affirm>
- Stripe agent-platform checkout is not assumed for launch because the agent-side program is private preview: <https://docs.stripe.com/agentic-commerce>
- Supabase private buckets require authenticated/RLS access or short-lived signed URLs: <https://supabase.com/docs/guides/storage/buckets/fundamentals>
- Groq's current vision example uses `qwen/qwen3.6-27b`; model IDs must remain configurable: <https://console.groq.com/docs/vision>
