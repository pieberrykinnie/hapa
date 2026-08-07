# HAPA Production Readiness Audit

## 1. Verdict

**Overall verdict: NOT_READY**

Fourteen blocking findings (2 S0, 12 S1) span 11 of 16 readiness dimensions. HAPA today is a
well-engineered, honestly-disclosed *demo prototype* — device-local, no real money moves, no
authentication — and it should not be represented as more than that. It is not ready for the launch
target defined in §2 below (real shoppers, real transactions, free-tier infrastructure only).

**Blocking findings**

| ID | Severity | Dimension | One-line summary |
|----|:---:|---|---|
| F-D13-01 | S0 | D13 Disclosure Accuracy | "Show hapa a vibe" claims to analyze the photo; applies a hardcoded result regardless of it |
| F-D16-02 | S0 | D16 Service-Tier Viability | Vercel Hobby's free tier prohibits the payment processing the launch target requires |
| F-D01-01 | S1 | D01 Identity and Session Integrity | No authentication exists anywhere; identity is an unverified device-local name |
| F-D02-01 | S1 | D02 Authoritative State | All state — identity, preferences, payment status, orders — lives only in browser `localStorage` |
| F-D04-01 | S1 | D04 Purchase Authorization | No real purchase execution exists; checkout is a client-side timer simulation |
| F-D05-01 | S1 | D05 Truthful Outcome Reporting | Every purchase reports full success, including a fabricated "sent to email" receipt claim |
| F-D06-01 | S1 | D06 Dependency Failure and Fallbacks | The SerpApi fallback is well-built but has never been exercised by a test (Principle II) |
| F-D08-01 | S1 | D08 Automated Quality Gates | No CI exists; the constitution's merge bar is enforced by nobody but a human |
| F-D09-01 | S1 | D09 Test Adequacy | Zero test coverage on every money-adjacent and metered-quota-consuming path |
| F-D10-01 | S1 | D10 Operability | No error monitoring or server-side logging; a production failure would go unnoticed |
| F-D12-01 | S1 | D12 Latency Budget Enforcement | Voice connection has no client-side timeout; a stalled connect can hang indefinitely |
| F-D15-01 | S1 | D15 Supply Chain | `pnpm install --frozen-lockfile` fails immediately — lockfile incompatible with pinned package manager |
| F-D16-01 | S1 | D16 Service-Tier Viability | SerpApi's free-tier quota does not cover normal feed usage at the launch target's scale |
| F-D16-03 | S1 | D16 Service-Tier Viability | Vapi has no ongoing free tier; the one-time signup credit is a hard, non-renewing ceiling |

## 2. Scope

**Launch target**: free-tier infrastructure only, roughly five real users, with real shoppers and
real money assumed in scope (see Assumptions below). The safety and privacy bar is the full HAPA
Constitution v2.1.0 and `SPEC.md` Definition of Done; the scale bar is near zero; the cost bar is a
hard constraint — a finding whose only fix requires paid infrastructure is treated as a launch
blocker, not a recommendation.

**Real-money assumption**: the user did not state whether the five launch users transact for real.
This audit assumes they do, as the safer direction (it produces a superset of findings). Every
finding whose severity depends on this assumption is tagged `severity_depends_on_assumption`; if the
launch in fact handles no real money, those findings can be re-scored in one pass without a fresh
audit (spec FR-033).

**Assessed at**: 2026-08-06T03:54:10Z
**Repository state**: commit `1586575d7845200bdd763047ec6ccc5ba713194a`, branch
`claude/github-spec-kit-setup-c32681` (working tree clean at the start of the audit)

**Assess-only boundary**: this audit modifies no application code, configuration, or dependency. It
is a read-only assessment; remediation is separate, subsequent work (spec FR-031). One exception is
documented in full in §8: a non-frozen `pnpm install` was run to gather evidence and its lockfile
side-effect was immediately reverted.

## 3. Severity Scheme

Reproduced verbatim from `contracts/finding-schema.md`.

| Level | Blocks launch | Definition |
|-------|:---:|------------|
| **S0 — Blocker** | Yes | Violates a constitution NON-NEGOTIABLE, a provider's terms of service, or the law. Exposes or loses personal data. Takes or reports money incorrectly. Ships a false user-facing claim. |
| **S1 — Critical** | Yes | A real user among the first five hits it in ordinary use within days. Includes free-tier quota exhaustion during normal browsing, and unrecoverable failure with no fallback. |
| **S2 — Major** | No | Degrades experience or operability; a workaround exists, or it is survivable while visibly imperfect. |
| **S3 — Minor** | No | Quality, maintainability, or polish. No user-visible risk. |

A finding whose remediation requires paid infrastructure (`free_tier_feasible = NO`) is at least S1
under this launch target — an unaffordable fix is a blocker, not a nice-to-have.

## 4. Dimension Summary

| ID | Dimension | Verdict | Blocking | Total | Basis |
|----|-----------|---------|:---:|:---:|-------|
| D01 | Identity and Session Integrity | FAIL | 1 | 1 | No authentication anywhere in the active code path (`app/page.tsx`, `ProfileSetup.tsx`, `local-store.ts`) |
| D02 | Authoritative State and Data Ownership | FAIL | 1 | 3 | All identity/preference/payment/order state confirmed `localStorage`-only across `hapa-provider.tsx` and `local-store.ts` |
| D03 | Private Media Lifecycle | PASS | 0 | 0 | Consent, on-device-only processing, deletion, and no-biometric-analysis each traced and verified in `ProfileSetup.tsx`/`local-store.ts`/`rules.ts` |
| D04 | Purchase Authorization | FAIL | 1 | 1 | Confirm-gate structurally sound (Principle VI met) but protects no real purchase capability |
| D05 | Truthful Outcome Reporting | FAIL | 1 | 1 | Every purchase reports guaranteed success including a verified-false "sent to email" claim |
| D06 | Dependency Failure and Fallbacks | FAIL | 1 | 2 | Fallback logic verified correct by code reading but `NOT_EXERCISED` by any test (Principle II) |
| D07 | Secrets and Configuration | CONCERNS | 0 | 1 | No secret exposure found (`SERPAPI_KEY` confirmed server-only); example env file incomplete |
| D08 | Automated Quality Gates | FAIL | 1 | 1 | No `.github/` directory; zero CI enforcing the constitution's stated merge bar |
| D09 | Test Adequacy on Critical Paths | FAIL | 1 | 1 | All 23 tests scoped to onboarding/billing-readiness; zero coverage on feed, purchase, or voice paths |
| D10 | Operability and Incident Response | FAIL | 1 | 1 | No error-monitoring dependency; only 3 client-side `console.warn` calls exist repo-wide |
| D11 | Accessibility and Device Variation | CONCERNS | 0 | 0 | Good verified hygiene (ARIA, keyboard paths, graceful mic-denial fallback); no automated a11y tooling to confirm beyond static review |
| D12 | Latency Budget Enforcement | FAIL | 1 | 1 | SerpApi timeout verified correct; voice connection has no client-side timeout at all |
| D13 | Disclosure Accuracy | FAIL | 1 | 1 | Photo-vibe overlay verified to fabricate its "reading your photo" claim |
| D14 | Documentation and Operator Onboarding | CONCERNS | 0 | 3 | README port mismatch, three conflicting env-var pictures, and one DOC_CONFLICT against spec-001's own contract, all verified |
| D15 | Supply Chain and Reproducibility | FAIL | 1 | 2 | `pnpm install --frozen-lockfile` verified to fail on this exact commit; `pnpm audit` otherwise clean |
| D16 | Service-Tier Viability | FAIL | 3 | 3 | SerpApi quota, Vercel Hobby terms, and Vapi's credit ceiling each independently re-derived and verified against current provider terms |

**Totals**: 22 findings, 14 blocking (2 S0, 12 S1), 8 non-blocking (7 S2, 1 S3). 12 dimensions FAIL,
3 CONCERNS, 1 PASS. Zero dimensions UNABLE_TO_ASSESS.

## 5. Findings

Grouped by dimension in registry order (D01–D05, D13, D06, D07, D10, D12, D16, D08, D09, D11, D14,
D15 — safety and correctness first, then resilience and operations, then engineering discipline),
severity-ordered within each dimension.

### D01 — Identity and Session Integrity

**Verdict**: FAIL — no authentication mechanism exists anywhere in the active code path. "Identity"
in the running app is a first-name string typed into a form and held in `localStorage`. This is a
real, correctly-disclosed gap against the launch target (Prototype Mode is a permitted exception
per the constitution's Local Prototype Exception, and no code claims to be authenticated), not a
silent defect — but it blocks the launch target defined in §2.

#### F-D01-01 — No authentication exists; identity is an unauthenticated device-local name

- **Dimension**: D01
- **Severity**: S1 (blocks launch)
- **Kind**: MISSING
- **Verification**: VERIFIED
- **Free-tier feasible**: YES
- **Severity depends on assumption**: none

**Evidence**
1. `CODE` — `app/page.tsx:1-5` — the entire app entry point renders `LocalOnboardingApp` with no
   sign-in step.
2. `CODE` — `components/onboarding/ProfileSetup.tsx:98-108` — the only "identity" collected is a
   free-text display name with no verification.
3. `CODE` — `lib/onboarding/local-store.ts:180-188` — `saveLocalOnboarding` writes the entire
   profile straight to `window.localStorage`, unauthenticated.
4. `ABSENT_ARTIFACT` — no auth provider, session cookie, middleware, or `/api/auth*` route exists
   anywhere in `app/` or `lib/`.

**Impact**
Nothing ties a shopper's profile, preferences, or purchase history to a verifiable identity. Two
people sharing a browser share one profile; the same person on two devices has two unrelated
profiles with no way to reconcile them.

**Resolution condition**
A shopper can authenticate via a maintained provider, and their profile, style preferences, and
purchase history are attributable to that verified identity rather than to a browser.

**Blocked by**: none

---

### D02 — Authoritative State and Data Ownership

**Verdict**: FAIL — every category of state the launch target requires to be authoritative —
identity, preferences, payment status, and order history — lives exclusively in browser
`localStorage` with no server-side counterpart of any kind.

#### F-D02-01 — All state, including full purchase history, is device-local only

- **Dimension**: D02
- **Severity**: S1 (blocks launch)
- **Kind**: MISSING
- **Verification**: VERIFIED
- **Free-tier feasible**: YES
- **Severity depends on assumption**: none

**Evidence**
1. `CODE` — `lib/onboarding/local-store.ts:14` — `LOCAL_ONBOARDING_KEY = "hapa.onboarding.v1"`,
   the sole persistence key for name, photos, style profile, and payment preference.
2. `CODE` — `components/hapa-provider.tsx:29-32` — a second, parallel set of `localStorage` keys
   (`hapa.dna`, `hapa.billing`, `hapa.saved`, `hapa.purchases`) used by the live `AppShell`.
3. `CODE` — `components/hapa-provider.tsx:493-503` — `purchases`, the entire order history, is
   written only via `saveJSON(PURCHASES_STORAGE_KEY, next)` — never sent to a server.
4. `ABSENT_ARTIFACT` — no database client, ORM, or `/api/*` write endpoint exists for profile,
   preference, or order data anywhere in the repository.

**Impact**
Clearing browser storage, switching browsers, or switching devices permanently and silently erases
a shopper's entire profile and order history with no recovery path.

**Resolution condition**
Identity, style preferences, payment-method readiness, and order records are persisted server-side
and survive the shopper's local browser storage being cleared.

**Blocked by**: none

#### F-D02-02 — Repeat purchase of the same product silently overwrites the earlier order record

- **Dimension**: D02
- **Severity**: S2
- **Kind**: INCORRECT
- **Verification**: VERIFIED
- **Free-tier feasible**: YES
- **Severity depends on assumption**: none

**Evidence**
1. `CODE` — `components/hapa-provider.tsx:135` — `purchases: Record<string, PurchaseRecord>` is
   keyed by `product.id`, not by a unique order identifier.
2. `CODE` — `components/hapa-provider.tsx:493-503` — each completed purchase writes
   `purchases[active.product.id] = { orderRef, purchasedAt }`, replacing any prior entry for that
   same product.
3. `CODE` — `components/purchase-flow.tsx:266-272` — the UI offers a "Buy another" action that
   re-triggers `requestPurchase(order.product)` for the identical product, guaranteeing this
   collision is reachable in normal use.

**Impact**
A shopper who buys the same item twice (restocking a consumable, buying a gift twice) permanently
loses the first order's reference the moment the second completes, even within the same session on
the same device.

**Resolution condition**
Purchasing the same product a second time creates a second, independently retrievable order record
rather than overwriting the first.

**Blocked by**: none

#### F-D02-03 — A second, unreachable identity/billing state system duplicates the active one

- **Dimension**: D02
- **Severity**: S2
- **Kind**: INCORRECT
- **Verification**: VERIFIED
- **Free-tier feasible**: YES
- **Severity depends on assumption**: none

**Evidence**
1. `CODE` — `app/page.tsx:1-5` — the only reachable entry point renders `LocalOnboardingApp`.
2. `CODE` — `components/local-onboarding-app.tsx:150-151` — `AppShell` is rendered only after
   `if (!dna) return null;`, i.e. only ever with a non-null `initialDNA`.
3. `CODE` — `components/hapa-provider.tsx:130` — `HapaProvider`'s `screen` state initializes to
   `initialDNA ? "feed" : "identity"`; given evidence #2, `screen` always starts at `"feed"`.
4. `CODE` — `components/app-shell.tsx:36-38` — `OnboardingIdentity`, `Onboarding`, and
   `OnboardingBilling` render only when `screen` is `"identity"`, `"swipe"`, or `"billing"` — states
   nothing in the reachable code path ever sets.
5. `CODE` — `components/onboarding-identity.tsx`, `components/onboarding.tsx`,
   `components/onboarding-billing.tsx` — three full screens, plus `lib/onboarding-cards.ts`, exist
   solely to serve this unreachable state machine, with their own `hapa.dna`/`hapa.billing`
   `localStorage` keys duplicating `hapa.onboarding.v1`'s job.

**Impact**
Not a live risk today — this code cannot execute via the shipped entry point. But it is a second,
divergent implementation of identity, style calibration, and billing capture sitting dormant in the
codebase, which a future edit could silently reactivate.

**Resolution condition**
Either the dead onboarding-identity/onboarding/onboarding-billing path is removed, or it is wired up
as the single source of truth and `LocalOnboardingApp`'s duplicate implementation is retired.

**Blocked by**: none

---

### D03 — Private Media Lifecycle

**Constitution**: Principle VII (NON-NEGOTIABLE) — **Compliant**.

**Verdict**: PASS — the active photo path (`components/onboarding/ProfileSetup.tsx` +
`lib/onboarding/local-store.ts`) was traced end to end — consent, derivation, transport, retention,
and deletion — and each stage was verified rather than assumed:

- **Consent**: a checkbox gated behind "Use these image names to tune my starter feed." appears
  before any pending photo can be submitted (`ProfileSetup.tsx:159-164`), and submission is blocked
  without it (`ProfileSetup.tsx:78`).
- **What is derived**: `shoppingLabelsFromFileName` (`local-store.ts:386-408`) matches the filename
  against a fixed allow-list of shopping terms via regex — never the image content, never identity
  or biometric signals. `validatePhoto` (`rules.ts:19-26`) and the `SENSITIVE_PATTERNS` guard
  (`rules.ts:13-17,61-69`) actively reject race/ethnicity/biometric/age/identity terms from ever
  reaching a suggestion.
- **Transport**: no `fetch`/`XMLHttpRequest` call ever sends photo bytes anywhere; `prepareLocalPhoto`
  (`local-store.ts:198-233`) resizes and re-encodes entirely in an in-browser `<canvas>`.
- **Retention bound**: `MAX_LOCAL_PHOTOS = 5` and `MAX_PHOTO_BYTES = 10MB`
  (`local-store.ts:15`, `constants.ts:3`) cap what accumulates in `localStorage`.
- **Deletion**: `removePhoto` (`local-onboarding-app.tsx:85-91`) filters the photo out and persists
  immediately — confirmed to actually remove the stored `dataUrl`, not just hide it in the UI.
- **Disclosure matches behavior**: "Filename cues stay on this device. Images are never uploaded."
  (`ProfileSetup.tsx:167`) accurately describes the verified behavior above.

No finding is filed against this dimension. Two related observations belong to other dimensions by
the frozen scope split: the *separate* in-feed "Show hapa a vibe" tool does not meet this same
disclosure bar (**F-D13-01**), and a documentation claim about this same flow's "visual features"
diverges from the code (**F-D14-03**).

---

### D04 — Purchase Authorization

**Constitution**: Principle VI (NON-NEGOTIABLE)

**Verdict**: FAIL — exactly one path in the codebase can result in a purchase completing, traced
exhaustively: `components/purchase-flow.tsx`'s `ConfirmSheet` → `confirmPurchase()`
(`hapa-provider.tsx:456-517`). `requestPurchase` is called only from `app-shell.tsx:59,69` and
`purchase-flow.tsx:268`; `confirmPurchase` is called only from the "Confirm purchase" button
(`purchase-flow.tsx:89`). **For the one path that exists, Principle VI's structural requirement is
genuinely met**: `requestPurchase` always sets `stage: "confirm"` first
(`hapa-provider.tsx:437-447`), the confirm sheet displays item, merchant, price, and payment method
(`purchase-flow.tsx:42-84`), and nothing bypasses that gate. This dimension still FAILs because the
capability the gate protects — a real purchase — does not exist.

#### F-D04-01 — No real purchase execution exists; the entire checkout path is a client-side simulation

- **Dimension**: D04
- **Severity**: S1 (blocks launch)
- **Kind**: MISSING
- **Verification**: VERIFIED
- **Free-tier feasible**: UNKNOWN
- **Severity depends on assumption**: real money moving at launch (research.md §R1). If the launch
  in fact handles no real transactions, this finding does not block launch.

**Evidence**
1. `CODE` — `lib/purchase-agent.ts:1-10` — the module's own comment: "DEMO SCOPE: this simulates
   the agent locally on a timer. No browser is driven, no merchant site is contacted, and no money
   moves."
2. `CODE` — `components/hapa-provider.tsx:456-517` — `confirmPurchase` schedules
   `window.setTimeout` steps entirely client-side; no `fetch` call to any payment or merchant API
   occurs anywhere in the function.
3. `CODE` — `lib/purchase-agent.ts:27-29` — `makeOrderRef()` returns a random string, not an
   identifier issued by any real order system.
4. `ABSENT_ARTIFACT` — no payment-provider SDK appears in `package.json` dependencies; no
   `/api/checkout*` or `/api/payment*` route exists.

**Impact**
The confirm-before-purchase control (Principle VI) has nothing real to protect yet. A shopper who
completes this flow has not bought anything, even though the UI (see F-D05-01) tells them they
have.

**Resolution condition**
Confirming a purchase triggers a real payment authorization through an integrated provider, and a
real, retrievable order is created only after that authorization succeeds.

**Blocked by**: F-D01-01, F-D02-01, F-D16-02

---

### D05 — Truthful Outcome Reporting

**Constitution**: Principle III ("Never Fail Loudly or Falsely")

**Verdict**: FAIL

#### F-D05-01 — Every purchase unconditionally reports full success, including a fabricated "sent to email" receipt claim

- **Dimension**: D05
- **Severity**: S1 (blocks launch)
- **Kind**: INCORRECT
- **Verification**: VERIFIED
- **Free-tier feasible**: YES
- **Severity depends on assumption**: none — false today regardless of the real-money assumption.

**Evidence**
1. `CODE` — `components/purchase-flow.tsx:229` — the completed-order receipt panel unconditionally
   renders `<dd>Sent to email</dd>` under a "Receipt" label.
2. `ABSENT_ARTIFACT` — no email/mail/notification-sending code exists anywhere in the repository —
   no email is ever sent.
3. `CODE` — `components/hapa-provider.tsx:456-517` — `confirmPurchase`'s timer chain has exactly
   one terminal state: `stage: "done"`. `lib/types.ts:148` defines a `"failed"` stage on
   `PurchaseStage`, but no code path ever sets it — it is unreachable.
4. `CODE` — `components/purchase-flow.tsx:249-253` — the completed screen also displays "{N}
   checkout steps verified" for steps narrated on a fixed timer (`lib/purchase-agent.ts:12-25`),
   not independently verified against anything.

**Impact**
Every purchase attempt — 100% of them, since no failure path is reachable — resolves to a screen
telling the shopper their order is confirmed, their payment method was charged, and a receipt was
emailed. None of that is true. This is the exact failure mode the constitution names as
non-negotiable to avoid: "Financial failures MUST show their real pending, failed, canceled, or
unknown state and MUST never be displayed as successful merely to protect the demo."

**Resolution condition**
The purchase-complete screen shows only claims the system can back up, and a real
failed/pending/unknown state is reachable and shown accurately whenever a future real payment
result is anything other than a verified success.

**Blocked by**: F-D04-01

---

### D13 — Disclosure Accuracy

**Verdict**: FAIL — one of the app's two photo-analysis surfaces actively tells the shopper an
analysis is happening that does not happen. The other is honestly disclosed. The dishonest one is
sufficient to fail this dimension.

#### F-D13-01 — "Show hapa a vibe" claims to read the photo's colors and style; it applies a hardcoded result regardless of the photo

- **Dimension**: D13
- **Severity**: S0 (blocks launch — a verified, currently-live false statement shown to every user
  of this feature)
- **Kind**: INCORRECT
- **Verification**: VERIFIED
- **Free-tier feasible**: YES
- **Severity depends on assumption**: none

**Evidence**
1. `CODE` — `components/photo-vibe-overlay.tsx:12-16` —
   `PHOTO_DEMO_SHIFT = { add_keywords: ["earth-tones", "vintage"], remove_keywords: [],
   dealbreakers: ["neon"] }`, a fixed constant.
2. `CODE` — `components/photo-vibe-overlay.tsx:39-46` — `submit()` calls
   `applyVibeShift(PHOTO_DEMO_SHIFT)` after a fixed `READING_MS = 1600` delay
   (`photo-vibe-overlay.tsx:17`), regardless of which file was selected.
3. `CODE` — `components/photo-vibe-overlay.tsx:80-81` — shown during that delay: "Reading your
   photo for colors, textures, and style…".
4. `CODE` — `components/photo-vibe-overlay.tsx:87` — shown before selection: "hapa reads the vibe —
   not who's in it."
5. `CODE` — `components/photo-vibe-overlay.tsx:10-11` — the module's own comment confirms this is
   intentional: "Stands in for real vision analysis... the demo has no vision model wired up, so a
   photo always reads as this plausible shift."

**Impact**
Every shopper who uses this feature is told, twice, that their specific photo is being analyzed.
It is not — the outcome is identical no matter what photo is selected.

**Resolution condition**
Either the feature performs a genuine analysis of the selected image, or its copy is changed to
accurately describe a fixed demo shift rather than claiming to read the photo.

**Blocked by**: none

**Contrast for context (not a finding)**: the primary onboarding photo-upload flow is honestly
disclosed — "Filename cues stay on this device. Images are never uploaded." accurately describes
its real, filename-only behavior (verified in D03).

---

### D06 — Dependency Failure and Fallbacks

**Constitution**: Principle II (NON-NEGOTIABLE) — "an untested fallback does not count."

**Verdict**: FAIL — the engineering underlying both fallback paths is genuinely well-built, confirmed
by direct code reading. Both FAIL anyway because neither is exercised by any test.

#### F-D06-01 — The SerpApi → curated-catalogue fallback is well-designed but has never been exercised by a test

- **Dimension**: D06
- **Severity**: S1 (blocks launch)
- **Kind**: INCORRECT
- **Verification**: NOT_EXERCISED
- **Free-tier feasible**: YES
- **Severity depends on assumption**: none

**Evidence**
1. `CODE` — `lib/serpapi.ts:11` — `TIMEOUT_MS = 6000`, enforced via a real `AbortController`
   (`serpapi.ts:212-213,230`) — matches `SPEC.md:850`'s stated "SerpApi 6-second timeout".
2. `CODE` — `lib/serpapi.ts:200-201,224,227-228` — missing key, `FORCE_FALLBACK=1`, SerpApi error
   payload, and any thrown exception all resolve to `[]`.
3. `CODE` — `app/api/feed/route.ts` (`blendWithFallback`) — a `[]` or thin live batch is topped up
   from `FALLBACK_FEED` rather than shown as an empty or broken feed.
4. `COMMAND_OUTPUT` — `findings/_cmd-test.md` — none of the 4 test files import from
   `lib/serpapi.ts`, `app/api/feed/route.ts`, or `lib/fallback-feed.ts`.

**Impact**
The one control standing between "SerpApi is down or quota-exhausted" and "the shopper sees a
broken or empty feed" has never actually been run and checked.

**Resolution condition**
An automated test drives the feed route through a missing-key or forced-fallback condition and
asserts the response still contains a full page of usable products.

**Blocked by**: none

#### F-D06-02 — The voice-call error/permission-denial fallback to typed text is well-designed but untested

- **Dimension**: D06
- **Severity**: S2
- **Kind**: INCORRECT
- **Verification**: NOT_EXERCISED
- **Free-tier feasible**: YES
- **Severity depends on assumption**: none

**Evidence**
1. `CODE` — `components/voice-overlay.tsx:54-66` — `isPermissionError` distinguishes a denied
   microphone from other failures.
2. `CODE` — `components/voice-overlay.tsx:128-142` — both permission denial and generic errors
   route to a `denied`/`error` state.
3. `CODE` — `components/voice-overlay.tsx:293-322` — that state renders a typed-text fallback wired
   to the same `applyVibeShift` the voice path uses.
4. `COMMAND_OUTPUT` — `findings/_cmd-test.md` — no test imports `lib/vapi.ts` or
   `components/voice-overlay.tsx`.

**Impact**
Lower severity than F-D06-01: voice is P2 priority, and the fallback is directly visible/usable to
the shopper if it fails, unlike a silent feed failure.

**Resolution condition**
A test forces a permission-denial and a generic Vapi error and confirms the typed-text fallback
appears and applies a vibe shift in both cases.

**Blocked by**: none

---

### D07 — Secrets and Configuration

**Verdict**: CONCERNS — no actual secret exposure was found, but the repository's own example
configuration is materially incomplete.

#### F-D07-01 — `.env.local.example` documents 1 of the 4 environment variables the active code reads

- **Dimension**: D07
- **Severity**: S2
- **Kind**: INCORRECT
- **Verification**: VERIFIED
- **Free-tier feasible**: YES
- **Severity depends on assumption**: none

**Evidence**
1. `CODE` — `.env.local.example:1-2` — documents only `NEXT_PUBLIC_VAPI_PUBLIC_KEY`.
2. `CODE` — `lib/serpapi.ts:200,293` — `process.env.SERPAPI_KEY` is required for live product
   discovery.
3. `CODE` — `lib/serpapi.ts:201,294` — `process.env.FORCE_FALLBACK` is an undocumented switch.

**Impact**
A new operator gets a working voice integration but a feed silently stuck in fallback-only mode
with no indication why.

**Resolution condition**
`.env.local.example` lists every environment variable the active code reads.

**Blocked by**: none

**Positive evidence supporting CONCERNS (not FAIL)**: `SERPAPI_KEY` is read only in `lib/serpapi.ts`,
which carries no `"use client"` directive and is imported solely by the two server-side route
handlers — confirmed never reachable from browser code. `NEXT_PUBLIC_VAPI_PUBLIC_KEY` is correctly
public-prefixed by design. No secret value is written to `localStorage`, logged, or exposed.

---

### D10 — Operability and Incident Response

**Verdict**: FAIL

#### F-D10-01 — No error monitoring or server-side logging exists; a production failure would go completely unnoticed

- **Dimension**: D10
- **Severity**: S1 (blocks launch)
- **Kind**: MISSING
- **Verification**: VERIFIED
- **Free-tier feasible**: YES
- **Severity depends on assumption**: none
- **Principle conflict**: Principle VII. Whatever monitoring solution closes this finding must not
  log photo data, image-derived personal content, or payment details — `SPEC.md:835`'s own intended
  design states logs should carry "analysis ID and status only, never the signed URL or image
  bytes." A naive "log everything" fix would trade this finding for a Principle VII violation.
  Surfaced here for a human decision on what an observability layer may capture, not resolved by
  this audit.

**Evidence**
1. `ABSENT_ARTIFACT` — no error-monitoring or logging service appears in `package.json`
   dependencies.
2. `COMMAND_OUTPUT` — repository-wide search for `console.error|console.warn|console.log` finds
   exactly 3 matches, all in `components/voice-overlay.tsx:156,160,165` — client-side, not
   aggregated, not visible to an operator.
3. `CODE` — `app/api/feed/route.ts`, `app/api/products/gallery/route.ts` — neither route handler
   contains a top-level `try/catch` or any logging call.

**Impact**
If SerpApi begins failing, if its quota is exhausted (D16), or if server-side code throws, nothing
surfaces that fact to anyone responsible for the app.

**Resolution condition**
A production failure generates a record an operator can find, subject to the logging constraint
above.

**Blocked by**: none

---

### D12 — Latency Budget Enforcement

**Constitution**: Principle IV ("Latency Is a Correctness Property")

**Verdict**: FAIL — the product-discovery path enforces a real, correct timeout. The
voice-connection path does not, and that gap drives the FAIL verdict.

#### F-D12-01 — Voice connection has no client-side timeout; a stalled connect can hang indefinitely with no fallback

- **Dimension**: D12
- **Severity**: S1 (blocks launch)
- **Kind**: MISSING
- **Verification**: VERIFIED
- **Free-tier feasible**: YES
- **Severity depends on assumption**: none

**Evidence**
1. `CODE` — `lib/vapi.ts:31-34` — `startVapiCall` awaits the Vapi SDK's `start()` with no
   `AbortController`, timer, or race against a deadline.
2. `CODE` — `components/voice-overlay.tsx:103-142` — the `"connecting"` state transitions only on
   SDK events; no client-side timer forces a transition if none fire.
3. `CODE` — `components/voice-overlay.tsx:46-52` — "connecting…" is the only UI shown, with no
   elapsed-time indication or automatic recovery.

**Impact**
On a stalled network, a shopper can be left staring at "connecting…" indefinitely with no automatic
path to the typed-text fallback that exists for every *other* voice-failure mode.

**Resolution condition**
A bounded client-side timer forces the overlay out of `"connecting"` into the existing
error/fallback state if no SDK event arrives in time.

**Blocked by**: none

**Positive evidence** (does not offset the FAIL verdict): `lib/serpapi.ts:11` sets
`TIMEOUT_MS = 6000`, enforced via a genuine `AbortController`, matching `SPEC.md:850` exactly. A
timeout here never converts into a false success.

---

### D16 — Service-Tier Viability

**Verdict**: FAIL — all three external dependencies were checked against the free-tier launch
target. Two fail outright; the third degrades safely but is a hard, non-renewing ceiling with no
monitoring to warn before it's hit.

#### F-D16-01 — SerpApi's free-tier quota does not cover normal feed usage at the launch target's scale

- **Dimension**: D16
- **Severity**: S1 (blocks launch)
- **Kind**: INCORRECT
- **Verification**: VERIFIED
- **Free-tier feasible**: NO
- **Severity depends on assumption**: none

**Evidence**
1. `EXTERNAL_TERMS` — https://serpapi.com/pricing — free plan: 250 searches/month, 50/hour
   throughput cap. Retrieved 2026-08-05.
2. `CODE` — `lib/serpapi.ts:19` — `MAX_QUERY_ATTEMPTS = 3`.
3. `CODE` — `lib/serpapi.ts:145-179` — one feed page (`PAGE_SIZE = 12`) costs 1 to 3 billed SerpApi
   searches depending on result thinness (`stillThin`, line 170; `Promise.all` fan-out, 172-174).
4. `CODE` — `app/api/products/gallery/route.ts:9-16` — one additional billed search per product
   detail view.

**Impact**
At the worst case, the entire monthly allowance covers roughly 83 feed pages across *all* users
combined. The 50/hour cap is tighter still. This ceiling is monthly and global — five users hit it
exactly as fast as five hundred would.

**Resolution condition**
Measured consumption for a representative five-user month fits within the plan's quota with
headroom, or a paid SerpApi tier is budgeted, or per-request consumption is reduced.

**Blocked by**: none

#### F-D16-02 — Vercel's free (Hobby) tier prohibits the commercial use the launch target requires

- **Dimension**: D16
- **Severity**: S0 (blocks launch under the real-money assumption)
- **Kind**: MISSING
- **Verification**: VERIFIED
- **Free-tier feasible**: NO
- **Severity depends on assumption**: real money moving at launch (research.md §R1). Under the
  narrower "closed testing, no real transactions" reading, Vercel Hobby hosting is not itself a
  blocker.

**Evidence**
1. `EXTERNAL_TERMS` — https://www.promptstoproduct.com/vercel-free-tier-limits — Vercel's Hobby
   plan is restricted to non-commercial, personal use; fair-use guidance explicitly names
   "processing payment" as a disqualifying commercial activity. Retrieved 2026-08-05.
2. `CODE` — `.specify/memory/constitution.md:83-84` — names Vercel as the deployment target.
3. Cross-reference — F-D04-01 (real payment execution is a launch-target requirement).

**Impact**
If real checkout is ever activated, running it on Vercel's free tier would violate that provider's
terms of service outright.

**Resolution condition**
Either a hosting provider whose free tier permits commercial/payment-processing use is selected, or
a paid Vercel tier is budgeted before real checkout goes live.

**Blocked by**: none

#### F-D16-03 — Vapi has no ongoing free tier; the one-time signup credit is a hard, non-renewing ceiling on voice

- **Dimension**: D16
- **Severity**: S1 (blocks launch)
- **Kind**: MISSING
- **Verification**: VERIFIED
- **Free-tier feasible**: NO
- **Severity depends on assumption**: none

**Evidence**
1. `EXTERNAL_TERMS` — https://www.layer3labs.io/guides/vapi-pricing — one-time $10 signup credit;
   no ongoing free tier; usage typically $0.07-$0.25/minute. Retrieved 2026-08-05.
2. `CODE` — `lib/vapi.ts:51-134` — `HAPA_ASSISTANT_CONFIG` uses `gpt-4o-mini` plus Vapi's hosted
   voice, contributing to the metered cost.

**Impact**
At the cited rates, the one-time credit covers roughly 40-140 minutes of voice interaction total
across every user, after which voice stops working account-wide with no renewal. Per D06, a Vapi
error does degrade gracefully to typed text — this is not a broken experience — but it is a real,
approaching ceiling with no monitoring (D10) to warn before it's reached.

**Resolution condition**
A funded, ongoing Vapi budget is established, or usage is capped/monitored so credit exhaustion is
anticipated rather than discovered when voice silently stops working.

**Blocked by**: none

**Note on volatility**: all quota and pricing figures above were retrieved 2026-08-05 and
re-confirmed during this audit pass. Provider terms and pricing change; re-verify before acting.

---

### D08 — Automated Quality Gates

**Verdict**: FAIL

#### F-D08-01 — No CI of any kind exists; the constitution's stated merge bar is enforced by nobody but a human

- **Dimension**: D08
- **Severity**: S1 (blocks launch)
- **Kind**: MISSING
- **Verification**: VERIFIED
- **Free-tier feasible**: YES
- **Severity depends on assumption**: none

**Evidence**
1. `ABSENT_ARTIFACT` — no `.github/` directory exists in the repository root.
2. `CODE` — `.specify/memory/constitution.md:129-130` — "`pnpm build` passing with zero TypeScript
   errors is a precondition for merge" — unenforced mechanically.
3. `COMMAND_OUTPUT` — `findings/_cmd-build.md`, `_cmd-test.md`, `_cmd-lint.md` — all three pass
   cleanly on this commit when run manually.

**Impact**
Nothing stops a future commit that breaks the build, fails tests, or fails lint from being merged.

**Resolution condition**
A CI workflow runs `pnpm build`, `pnpm test`, and `pnpm lint` on every push/PR and merging is
blocked when any fail.

**Blocked by**: F-D15-01

---

### D09 — Test Adequacy on Critical Paths

**Verdict**: FAIL

#### F-D09-01 — Zero test coverage on every money-adjacent and metered-quota-consuming path

- **Dimension**: D09
- **Severity**: S1 (blocks launch)
- **Kind**: MISSING
- **Verification**: VERIFIED
- **Free-tier feasible**: YES
- **Severity depends on assumption**: none

**Evidence**
1. `COMMAND_OUTPUT` — `findings/_cmd-test.md` — all 23 passing tests, across all 4 test files, are
   scoped to `lib/onboarding/local-store.ts` and `lib/onboarding/billing.ts`.
2. `ABSENT_ARTIFACT` — no test exercises `app/api/feed/route.ts`,
   `app/api/products/gallery/route.ts`, `lib/serpapi.ts`, `lib/vapi.ts`,
   `components/purchase-flow.tsx`, `lib/purchase-agent.ts`, or `components/hapa-provider.tsx`.

**Impact**
The two areas of the codebase that most directly touch money and metered external cost have no
automated coverage at all.

**Resolution condition**
Automated tests cover the feed/fallback blending logic, the purchase confirm→complete state
machine, and the purchase-record write path, in addition to existing onboarding coverage.

**Blocked by**: none

---

### D11 — Accessibility and Device Variation

**Verdict**: CONCERNS — genuinely good verified hygiene, but nothing beyond static reading confirms
it works for a real assistive-technology user.

**What was verified**: 50 `aria-*`/`role` attributes across components; native `<button>` elements
throughout (not click-handled `<div>`s); a full keyboard equivalent for the "This you?" swipe deck
(`ArrowLeft`/`ArrowRight`, `components/onboarding/ThisYouDeck.tsx:84-91`) alongside visible buttons;
a fully keyboard/typing-operable fallback when microphone permission is denied
(`components/voice-overlay.tsx:293-322`).

**Gap**: `ABSENT_ARTIFACT` — no automated accessibility tooling (axe-core, jest-axe, Playwright a11y
checks) appears in `package.json` devDependencies, and no test exercises focus order,
screen-reader label correctness, or color contrast. Reported `UNABLE_TO_ASSESS` rather than
passing, per spec FR-007.

No blocking finding filed — the gap is an absence of verification tooling, not a demonstrated
defect, and free-tier tooling (axe-core is open source) makes closing it low-cost.

---

### D14 — Documentation and Operator Onboarding

**Verdict**: CONCERNS — no finding rises to launch-blocking, but a new operator or contributor
would be actively misled in three distinct, verified ways.

#### F-D14-01 — README instructs the wrong port

- **Dimension**: D14
- **Severity**: S2
- **Kind**: INCORRECT
- **Verification**: VERIFIED
- **Free-tier feasible**: YES
- **Severity depends on assumption**: none

**Evidence**
1. `CODE` — `README.md` — unmodified `create-next-app` template, instructing "Open
   http://localhost:3000".
2. `CODE` — `package.json` scripts.dev — `"next dev --webpack --hostname 127.0.0.1 --port 3001"`.

**Impact**
A new operator following the checked-in README literally gets a connection error.

**Resolution condition**
README reflects the actual dev command and port.

**Blocked by**: none

#### F-D14-02 — Three mutually inconsistent pictures of required environment configuration coexist

- **Dimension**: D14
- **Severity**: S2
- **Kind**: INCORRECT
- **Verification**: VERIFIED
- **Free-tier feasible**: YES
- **Severity depends on assumption**: none

**Evidence**
1. `CODE` — `.env.local.example` — documents 1 variable.
2. `CODE` — active code requires 2 more, undocumented (`SERPAPI_KEY`, `FORCE_FALLBACK` — F-D07-01).
3. `CODE` — `SPEC.md:861-879` — documents a wholly different, 12-variable block for a
   Supabase/Groq/Stripe-backed system.
4. `ABSENT_ARTIFACT` — no `@supabase/*`, `groq`, or `stripe` package exists in `package.json`; no
   matching source files exist anywhere.

**Impact**
A contributor consulting `SPEC.md` §14 for setup guidance would configure an entirely different,
unbuilt system.

**Resolution condition**
`SPEC.md` clearly marks which sections describe the current build versus the target architecture,
or the repository's `.env.local.example` is reconciled with what the active code needs.

**Blocked by**: none

#### F-D14-03 — `specs/001-voice-shopping-feed/contracts/local-storage.md` claims visual-feature extraction that the code doesn't perform

- **Dimension**: D14
- **Severity**: S2
- **Kind**: INCORRECT
- **Verification**: VERIFIED
- **Free-tier feasible**: YES
- **Severity depends on assumption**: none

**Evidence**
1. `DOC_CONFLICT` — `specs/001-voice-shopping-feed/contracts/local-storage.md:12` states
   `prepareLocalPhoto` "extracts visual features."
2. `CODE` — `lib/onboarding/local-store.ts:198-233` — `prepareLocalPhoto` assigns
   `features: neutralVisualFeatures()`, a hardcoded constant (`local-store.ts:468-478`), never
   calling the real pixel-analysis function.
3. `CODE` — `lib/onboarding/local-store.ts:235-296` — `extractVisualFeatures` is a genuine, correct
   implementation, but is called only from the test suite, never from application code.

**Impact**
No uploaded photo's actual colors, contrast, or warmth are analyzed in the running app — only its
filename is. Not a privacy issue, but a verified, concrete gap between a written contract and the
code implementing it.

**Resolution condition**
Either `prepareLocalPhoto` is wired to call `extractVisualFeatures` on real image data, or the
local-storage contract is corrected.

**Blocked by**: none

---

### D15 — Supply Chain and Reproducibility

**Verdict**: FAIL

#### F-D15-01 — `pnpm install --frozen-lockfile` fails immediately: the lockfile is incompatible with the pinned package manager

- **Dimension**: D15
- **Severity**: S1 (blocks launch)
- **Kind**: INCORRECT
- **Verification**: VERIFIED
- **Free-tier feasible**: YES
- **Severity depends on assumption**: none

**Evidence**
1. `CODE` — `package.json` — `"packageManager": "pnpm@11.2.2"`.
2. `COMMAND_OUTPUT` — `findings/_provenance.md` — installed `pnpm --version` resolves to `11.2.2`
   (matching), but `pnpm-lock.yaml:1` declares `lockfileVersion: '6.0'`.
3. `COMMAND_OUTPUT` — `findings/_provenance.md` — `pnpm install --frozen-lockfile` fails with
   `[ERR_PNPM_LOCKFILE_BREAKING_CHANGE]`, exit code 1 — the exact command a new contributor or any
   CI pipeline honoring `packageManager` would run.

**Impact**
The reproducible-install path is broken today.

**Resolution condition**
`pnpm install --frozen-lockfile` succeeds against the committed lockfile without modification.

**Blocked by**: none

#### F-D15-02 — Several devDependencies are a major version behind latest; none are exact-pinned

- **Dimension**: D15
- **Severity**: S3
- **Kind**: INCORRECT
- **Verification**: VERIFIED
- **Free-tier feasible**: YES
- **Severity depends on assumption**: none

**Evidence**
1. `COMMAND_OUTPUT` — `pnpm install` output flagged: `framer-motion 12.43.0 (13.0.0 available)`,
   `@types/node 20.19.43 (26.1.2 available)`, `eslint 9.39.5 (10.8.0 available)`,
   `typescript 5.9.3 (7.0.2 available)`, `vitest 3.2.7 (4.1.10 available)`.
2. `COMMAND_OUTPUT` — `pnpm audit`: "No known vulnerabilities found."

**Impact**
Routine maintenance debt, not a security exposure today.

**Resolution condition**
Dependencies are reviewed and updated on a regular cadence; not required before launch.

**Blocked by**: none

## 6. Deferred by Scale

Consciously **not assessed**, because the launch target assumes roughly five real users. These are
not passes — a later audit at larger scale must examine them fresh.

- **Horizontal scaling, autoscaling, multi-region, failover** — no infrastructure of this kind
  exists or was evaluated; irrelevant at five users, essential well before five hundred.
- **Database connection pooling and query optimization under concurrency** — moot today (no
  database exists at all, per D02); becomes real the moment F-D02-01 is remediated with a real
  concurrent user base.
- **Load and stress testing, capacity planning** — not performed; five users generates no
  meaningful load signal.
- **Abuse-oriented rate limiting and bot defense** (distinct from the quota *protection* covered
  under D16, which concerns cost/availability, not abuse) — not assessed; worth revisiting once
  the user base is large enough to attract abuse traffic.
- **CDN cache-hit optimization** — not assessed; Vercel's default edge behavior was not
  benchmarked.

## 7. Remediation Sequence

Blocking findings in dependency order. Three findings have explicit prerequisites; the remaining
eleven are independently startable in any order or in parallel.

**Independently startable now** (11): F-D01-01, F-D02-01, F-D06-01, F-D08-01\*, F-D09-01, F-D10-01,
F-D12-01, F-D13-01, F-D15-01, F-D16-01, F-D16-02, F-D16-03

\* F-D08-01 is startable immediately but will not be *meaningfully closed* until F-D15-01 is fixed
(a CI pipeline built on a broken frozen-lockfile install fails before it can check anything else).

**Sequenced**:
1. F-D15-01 (fix the lockfile) → unblocks a working F-D08-01 (CI).
2. F-D01-01 (identity) + F-D02-01 (authoritative persistence) + F-D16-02 (hosting terms) → all
   three must resolve before F-D04-01 (real purchase execution) can be built responsibly.
3. F-D04-01 → unblocks F-D05-01 (truthful outcome reporting needs a real outcome to report
   truthfully).

```
F-D15-01 ──▶ F-D08-01

F-D01-01 ─┐
F-D02-01 ─┼─▶ F-D04-01 ──▶ F-D05-01
F-D16-02 ─┘
```

All other blocking findings (F-D06-01, F-D09-01, F-D10-01, F-D12-01, F-D13-01, F-D16-01, F-D16-03)
have no dependencies on any other finding in this list and can be worked in parallel with the above.

## 8. Provenance

**Commands run** (full output in `findings/_cmd-*.md` and `findings/_provenance.md`):

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | **FAILED** — `ERR_PNPM_LOCKFILE_BREAKING_CHANGE` (this is itself F-D15-01's evidence) |
| `pnpm install --no-frozen-lockfile` | Succeeded; rewrote `pnpm-lock.yaml`, immediately reverted with `git checkout -- pnpm-lock.yaml` to preserve non-mutation |
| `pnpm build` | SUCCESS — zero TypeScript errors, 5 routes |
| `pnpm test` | SUCCESS — 4 files, 23/23 tests passed |
| `pnpm lint` | SUCCESS — 0 errors, 1 warning (`components/feed.tsx:141` unused variable) |
| `pnpm audit` | "No known vulnerabilities found" |

**Non-mutation confirmation**: `git status --porcelain -- . ':!specs/'` returns empty as of this
report's completion — the repository outside `specs/002-production-readiness-audit/` is unchanged
from the commit this audit describes, with the single documented exception above (a lockfile
rewrite that was immediately reverted).

**Quota and pricing claims and their retrieval dates** — all retrieved 2026-08-05, re-confirmed
during this audit pass; provider terms and pricing change and should be re-verified at remediation
time:

| Claim | Source | Retrieved |
|---|---|---|
| SerpApi free plan: 250 searches/month, 50/hour cap | https://serpapi.com/pricing | 2026-08-05 |
| Vercel Hobby: non-commercial use only, payment processing named as disqualifying | https://www.promptstoproduct.com/vercel-free-tier-limits | 2026-08-05 |
| Vapi: one-time $10 signup credit, no ongoing free tier, $0.07-$0.25/min typical | https://www.layer3labs.io/guides/vapi-pricing | 2026-08-05 |

**Dimension-registry amendments during this feature's lifecycle** (per
`contracts/dimension-registry.md`'s own amendment log):

| Date | Change | Reason |
|---|---|---|
| 2026-08-05 | D16 added | The free-tier constraint introduced service-tier terms/quota viability, uncovered by any existing dimension. Spec FR-035 added first, per Constitution Principle V. |
| 2026-08-05 | D14 scope extended to carry FR-010; D13/D14 boundary stated explicitly | `/speckit-analyze` finding: FR-010 had zero task coverage. |

No registry amendment occurred during this execution pass (T009-T052) — the registry was already
frozen and complete before dimension assessment began.

**FR-034 principle-conflict scan** (T041): every finding's resolution condition was reviewed for
tension with a constitution principle. One genuine conflict was found and is recorded on the
finding itself rather than resolved here: **F-D10-01** (add error monitoring) risks colliding with
**Principle VII** (photo privacy) if implemented naively — see that finding's `principle_conflict`
field. No other finding's resolution was found to conflict with a constitution principle.

**Re-run guidance**: a later audit re-running this same process must assess all 16 dimensions in
this registry — a dimension missing from a future report signals a broken run, not resolved work.
Surviving findings keep their exact IDs (`F-D<nn>-<nn>`) across runs; a finding that has been fixed
is marked resolved in the newer report rather than deleted, so remediation is demonstrable; only a
genuinely new observation gets a new ID. Two runs are comparable by diffing their dimension-summary
tables and finding lists directly.

**Fragment provenance**: the per-dimension files under `findings/D*.md` are a **Phase 3 snapshot**
— each dimension's state at assembly time (T025), before this report's own Phase 4-6 enrichment
passes (resolution-condition sharpening, `blocked_by` graph, principle-conflict scan) were applied
directly to this document. They are retained as working evidence and are not kept in sync with this
report after assembly; this document is the single authoritative artifact. Every finding above can
be traced to the fragment file bearing its dimension ID for the original, unenriched observation.

**Judgment-check outcomes** (T051, walking `quickstart.md` §Validating):

- **SC-001** (5-minute verdict comprehension): §1 states the verdict and all 14 blocking findings
  as one-line entries with no methodology or caveats ahead of it — satisfied by construction.
- **SC-004** (evidence locatable in <2 min, 9/10 attempts): every finding cites `path:line`;
  spot-checked F-D16-01, F-D13-01, F-D15-01, F-D02-03 against the live repository — all confirmed
  correct on the first look.
- **SC-005** (checkable resolution conditions): every finding's `resolution_condition` was reviewed
  during Phase 4 (T031) for observability rather than argument — none required rewriting.
- **SC-008** (scoped task from any finding without a follow-up question): each finding names an
  exact file/line, a concrete impact, and an observable resolution condition — verified sufficient
  for all 22 findings during the Phase 4 pass.
- **SC-012** (no PASS where the capability doesn't exist): D03 and only D03 carries a PASS verdict;
  its basis names five specific, verified positive controls (consent, filename-only derivation,
  no-network-transport, retention bounds, working deletion), not the absence of a problem. No other
  dimension was scored PASS while any part of its underlying capability was missing.
