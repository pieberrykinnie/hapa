---

description: "Task list for Production Hardening — Decide What's Real"
---

# Tasks: Production Hardening — Decide What's Real

**Input**: Design documents from `/specs/003-production-hardening/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Tests are included per Constitution Principle II ("an untested fallback does not count") and spec FR-020, which names three behaviors that MUST each have an automated test (feed fallback, purchase-link, voice timeout). One additional test task (photo-vibe analysis) is included because it is the other new network path this feature adds and Principle II is NON-NEGOTIABLE, even though FR-020 doesn't name it explicitly.

**Organization**: Tasks are grouped by user story (spec.md priorities: US1/US2/US3 = P1, US4/US5/US6 = P2).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps the task to spec.md's user stories (US1–US6)
- File paths are exact and repo-relative.

---

## Phase 1: Setup

**Purpose**: Fixes that unblock every downstream story — a broken lockfile blocks `pnpm install` for all of them, and the new environment variables are referenced throughout.

- [X] T001 Regenerate `pnpm-lock.yaml` under the pinned `pnpm@11.2.2` (`package.json`'s `packageManager` field): run `pnpm install --no-frozen-lockfile`, review the diff, and commit the result. Verify the fix with `pnpm install --frozen-lockfile` on a clean `node_modules` — it must succeed without further modifying the lockfile. Closes audit finding `F-D15-01`; required for FR-019/SC-008 (US6) and for every other task in this file that runs `pnpm install`/`pnpm test`/`pnpm build`.
- [X] T002 [P] Add the new environment variables this feature introduces to `.env.local.example`, alongside the existing `NEXT_PUBLIC_VAPI_PUBLIC_KEY` entry: `GROQ_API_KEY=` (server-only, US2), `PHOTO_MODEL=qwen/qwen3.6-27b` (configurable model id, matching `SPEC.md:868`'s convention), `SENTRY_DSN=` (server-side, US5), `NEXT_PUBLIC_SENTRY_DSN=` (client-side, US5 — a DSN is a destination identifier, not a secret). One-line comments per var, matching the existing file's style.

**Checkpoint**: `pnpm install --frozen-lockfile` succeeds; all documented env vars exist as placeholders.

---

## Phase 2: Foundational

No cross-story blocking prerequisites exist beyond Phase 1. Each user story below touches a disjoint set of files (US1: purchase/checkout code; US2: the photo-vibe overlay and a new Groq module; US3: the feed route and SerpApi client; US4: the voice overlay and Vapi client; US5: new Sentry config files; US6: a new CI workflow) and spec.md's own framing states these are independently deliverable. Proceed directly to Phase 3.

---

## Phase 3: User Story 1 - Buy the Real Item From the Real Seller (Priority: P1) 🎯 MVP

**Goal**: "Buy now" opens the product's real merchant listing in a new tab instead of running a simulated in-app checkout; a lightweight per-product visit record (never a payment claim) replaces the retired purchase record.

**Independent Test**: Tap "Buy now" on any product card or the product detail page and verify a new tab opens to that product's real `link`, with no in-app confirmation/receipt screen; tap it again on the same product and confirm the earlier visit timestamp is preserved, not overwritten.

### Implementation for User Story 1

- [X] T003 [US1] In `lib/types.ts`, delete `PurchaseStage`, `PurchaseStep`, and `Order` (lines 148–161). Add a new `ListingVisit` interface per `data-model.md`: `{ productId: string; merchant: string; listingUrl: string; openedAt: string[] }`.
- [X] T004 [P] [US1] Create `lib/listing-visits.ts` with two pure, directly-testable functions (following the separation-of-concerns pattern `lib/onboarding/rules.ts` already uses): `isValidListingUrl(link: string | null | undefined): boolean` (basic check — non-empty, parses via `new URL()`, protocol is `http:`/`https:`) for spec FR-005's guard, and `recordVisit(current: Record<string, ListingVisit>, product: Product, now?: string): Record<string, ListingVisit>` which appends `now ?? new Date().toISOString()` to the existing record's `openedAt` array (creating a new record with a one-entry array on first visit) — the array is append-only per FR-004, never truncated or overwritten.
- [X] T005 [US1] Delete `lib/purchase-agent.ts` entirely (`buildSteps`, `STEP_MS`, `makeOrderRef` — the simulated checkout timeline they drove no longer exists, per spec FR-003).
- [X] T006 [US1] Delete `components/purchase-flow.tsx` (`ConfirmSheet`, `AgentRun`, and every "Order confirmed"/"Receipt ready"/"Sent to email"/"checkout steps verified" string it renders — see `contracts/listing-visit.md`). Update `components/app-shell.tsx`: remove the `order`/`<PurchaseFlow>` import and rendering (currently `app-shell.tsx:14,29,81`), and change both `onBuy` wirings (`app-shell.tsx:59,69`) to call a new `visitListing` action directly instead of `requestPurchase` — no confirmation modal, per `contracts/listing-visit.md`'s "no server round trip of its own" behavior contract.
- [X] T007 [US1] Rewrite the purchase-agent-driven state in `components/hapa-provider.tsx`: remove `purchases`/`order` state, `PURCHASES_STORAGE_KEY`, `PurchaseRecord`, `agentTimersRef`/`activeOrderRef`, and the `requestPurchase`/`confirmPurchase`/`cancelPurchase`/`purchaseFor` actions (and their imports from `lib/purchase-agent`). Replace with: a `listingVisits: Record<string, ListingVisit>` state hydrated from/persisted to a renamed storage key `hapa.listing-visits` (deliberately not reusing `hapa.purchases`, so a stale blob from an old build is never misread — per `data-model.md`); a `visitListing(product: Product): void` action that, guarded by `isValidListingUrl(product.link)` from `lib/listing-visits.ts`, opens `product.link` via `window.open(product.link, "_blank", "noopener,noreferrer")` and updates state via `recordVisit`; and a `visitFor(id: string): ListingVisit | null` replacing `purchaseFor`. Export both from the context value.
- [X] T008 [P] [US1] Update `components/feed.tsx`'s `SavedCard` and `FeedCard` (currently using `purchaseFor`/`purchased.orderRef` at lines 378–379, 401–405, 433, 451–456, 566, 569–574): switch to `visitFor`, derive "visited" from `openedAt.length > 0`, change the button label from "Buy another" to "View listing again" once visited (per `data-model.md`'s UI-consequence note and spec Acceptance Scenario US1.2), and remove the "Bought · Shipping to you" claim — replace with copy that states only that the listing was opened (e.g. "Opened at {merchant}"), never a payment/order claim (FR-002). Per FR-005, if `isValidListingUrl(product.link)` is false, either omit the Buy button or render it disabled with copy stating the listing can't currently be opened.
- [X] T009 [P] [US1] Apply the equivalent change to `components/product-page.tsx` (currently `purchaseFor`/`purchased.orderRef` at lines 57–59, 234–246, 248, 283–290): replace the "Already bought / Shipping to you · {orderRef}" block with a "View listing again" state derived from `visitFor`, remove the false "HAPA prepares checkout. You confirm before payment." caption (line 289 — this claim is no longer true), and apply the same FR-005 guard as T008.
- [X] T010 [US1] Grep-sweep the repository for any remaining reference to `Order`, `PurchaseStage`, `PurchaseStep`, `PurchaseRecord`, or `purchase-agent` outside of `specs/` and this file, and remove any dead import or unused code found. This is the direct check for SC-009 ("zero references to the retired simulated-checkout capability... remain reachable").
- [X] T011 [P] [US1] Write `tests/purchase-flow.test.ts` (Vitest) against `lib/listing-visits.ts`: `recordVisit` called twice for the same product appends a second `openedAt` timestamp without losing the first (FR-004, the direct regression test for the fixed `F-D02-02`); `recordVisit` on a fresh product creates a one-entry record with the correct `merchant`/`listingUrl` copied from the `Product`; `isValidListingUrl` returns `true` for a well-formed `https://` URL and `false` for `""`, `null`, and a malformed string (FR-005). Satisfies FR-020's requirement that the purchase-link behavior be covered by an automated test.

**Checkpoint**: User Story 1 is fully functional and testable independently — `pnpm test` passes T011, and manually tapping "Buy now" opens a real listing with no simulated checkout anywhere in the UI.

---

## Phase 4: User Story 2 - Get a Real Read on a Photo's Vibe (Priority: P1)

**Goal**: The "show hapa a vibe" photo tool sends the submitted photo to a real vision analysis (Groq) and derives the feed shift from its actual content, with an honest failure state and typed-text fallback when analysis can't produce a usable result.

**Independent Test**: Submit two visually distinct photos (warm earth tones vs. cool neon) and verify the resulting feed shifts differ; set `GROQ_API_KEY` to an invalid value and verify an honest failure state with a working typed-text fallback appears instead of a fixed/fabricated shift.

### Implementation for User Story 2

- [X] T012 [US2] Create `lib/groq-vision.ts` implementing `analyzePhotoForVibe(photo: File): Promise<VibeShift | null>` per `contracts/groq-vision-analysis.md`: reads `GROQ_API_KEY` server-side only (never imported by a `"use client"` module, mirroring `lib/serpapi.ts`'s `SERPAPI_KEY` convention); returns `null` immediately if the key is missing; calls Groq's chat-completions endpoint with the model from `process.env.PHOTO_MODEL` (default `"qwen/qwen3.6-27b"`) in JSON mode, sending the photo as base64 image content, prompted to return `{ add_keywords: string[]; remove_keywords: string[]; dealbreakers: string[] }`; enforces a 5000ms timeout via `AbortController`, matching `lib/serpapi.ts`'s `TIMEOUT_MS`/`AbortController` pattern (`lib/serpapi.ts:11,212-213,230`); returns `null` on timeout, network error, or a non-JSON/malformed response — never a thrown exception.
- [X] T013 [US2] In `lib/groq-vision.ts`, before returning a non-null result, validate every string in `add_keywords`/`remove_keywords`/`dealbreakers` against the sensitive-content pattern family `lib/onboarding/rules.ts`'s `SENSITIVE_PATTERNS` already defines (export that constant from `lib/onboarding/rules.ts` or factor it into a small shared module both files import — do not duplicate the pattern list). Reject the entire result (return `null`) if any keyword matches. Satisfies spec FR-007.
- [X] T014 [P] [US2] Create `app/api/vibe-photo/route.ts`: a `POST` handler, shaped like `app/api/feed/route.ts`, that reads the submitted photo from the request's `FormData`, calls `analyzePhotoForVibe`, and returns `Response.json({ shift })` where `shift: VibeShift | null`. This is the only place `GROQ_API_KEY` is read from a route — `components/photo-vibe-overlay.tsx` (a client component) must never import `lib/groq-vision.ts` directly, per `contracts/groq-vision-analysis.md`'s "Where this runs" section.
- [X] T015 [US2] Update `components/photo-vibe-overlay.tsx`: remove the `PHOTO_DEMO_SHIFT` constant (lines 12–16) and the fixed `READING_MS` timeout (line 17, 42–45). `submit()` now `POST`s the selected photo as `FormData` to `/api/vibe-photo`; on a non-null `shift` in the response, call `applyVibeShift(shift)` and `onClose()` as before; on `null` or a fetch failure, show an honest failure state (reusing the `reading`-state UI slot) with an inline typed-text fallback input — follow the same pattern `components/voice-overlay.tsx`'s `isFallback` branch (lines 293–299, 304–321) already uses: a text input plus submit button that calls `applyVibeShift(parseVibeText(...))` via `lib/vibe-parser.ts`, not a redirect to a different overlay component. Never falls back to a fixed/fabricated shift (FR-008); the "Reading your photo…" status text must remain accurate for the whole duration, including this failure case (FR-009).
- [X] T016 [P] [US2] Update the pre-submission copy in `components/photo-vibe-overlay.tsx` (currently "A screenshot, a saved pic, anything with the look you want more of. hapa reads the vibe — not who's in it.", lines 85–88) to accurately state the photo is sent to a server-side analysis service — no on-device-only or "never uploaded" language may remain in this feature's copy specifically (spec FR-023). Do not alter the separate onboarding photo flow's disclosure, which remains accurate as-is.
- [X] T017 [P] [US2] Write `tests/photo-vibe-analysis.test.ts` (Vitest, mocking `global.fetch`) against `lib/groq-vision.ts`: a well-formed Groq JSON-mode response yields a validated `VibeShift`; a missing `GROQ_API_KEY` yields `null` with no fetch attempted; a fetch that never resolves yields `null` after the 5000ms timeout (use `vi.useFakeTimers()`, not a real 5-second wait); a malformed/non-JSON response yields `null`; a response whose keywords match a `SENSITIVE_PATTERNS` entry yields `null` even though the response was otherwise well-formed (FR-007).

**Checkpoint**: User Stories 1 AND 2 both work independently — two visually distinct sample photos produce different feed shifts, and an invalid `GROQ_API_KEY` produces the honest-failure/typed-fallback path, not a fixed shift.

---

## Phase 5: User Story 3 - Trust the Feed Even When Product Discovery Struggles (Priority: P1)

**Goal**: The feed keeps returning a full page of relevant products when live SerpApi search is unavailable, proven by an automated test rather than manual inspection; measured SerpApi consumption per shopper session stays comfortably under the free-tier allowance at this project's ~5-user scale.

**Independent Test**: `pnpm test` passes a test that forces live search unavailable and asserts `app/api/feed/route.ts`'s `GET` still returns a full page from `FALLBACK_FEED`.

### Implementation for User Story 3

- [X] T018 [P] [US3] Write `tests/feed-fallback.test.ts` (Vitest): import and call `GET` from `app/api/feed/route.ts` directly with a constructed `Request` (per `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` — route handlers are plain async functions, callable directly). Force live search unavailable via `process.env.FORCE_FALLBACK = "1"` (the existing check at `lib/serpapi.ts:201,294`) or by stubbing `global.fetch` to reject. Assert the response is a full `PAGE_SIZE`-length (12-item) page of `FALLBACK_FEED`-sourced products across at least two different `cursor` values, proving both the initial-unavailable case (FR-010) and the continues-serving-without-degradation case for the remainder of an exhausted period (FR-012).
- [X] T019 [US3] Measure (or reduce) live SerpApi consumption per typical shopper session against the confirmed 250/month, 50/hour free-tier allowance at the ~5-shopper launch target (spec FR-011/SC-004 — "less than 80% of the provider's monthly and hourly allowances"). Manually tally or lightly instrument the number of SerpApi calls a representative session makes (initial feed load + a few scroll pages + a couple of product-detail opens, accounting for `lib/serpapi.ts`'s `buildQueryVariants` rotation firing up to `MAX_QUERY_ATTEMPTS` calls when a batch is thin, plus `fetchProductGallery`'s one-call-per-detail-view). If the measured/extrapolated monthly or hourly count exceeds 80% of the allowance at 5 concurrent shoppers, reduce it (e.g. lower `MAX_QUERY_ATTEMPTS` or `MIN_BATCH_BEFORE_ROTATE` in `lib/serpapi.ts`) until it's comfortably under. Record the measurement and any change made in `specs/003-production-hardening/research.md` (append a short "R7 — measured quota headroom" note) so the number is traceable.

**Checkpoint**: User Stories 1, 2, and 3 all work independently. `pnpm test` proves the feed never goes empty when SerpApi is down, and the quota headroom is documented as safe at target scale.

---

## Phase 6: User Story 4 - Trust Voice Steering Not to Get Stuck (Priority: P2)

**Goal**: A voice connection attempt that neither succeeds nor fails within a bounded wait is automatically treated as a failure, surfacing the same typed-text fallback already shown for a denied mic or a connection error.

**Independent Test**: Simulate a voice connection that never completes and verify the interface automatically shows the fallback UI after the bounded wait, not an indefinite "connecting…" state.

### Implementation for User Story 4

- [X] T020 [US4] In `lib/vapi.ts`, add an exported connection-timeout helper — e.g. `raceConnectionOutcome(vapi: Vapi, timeoutMs?: number): Promise<"call-start" | "call-end" | "error" | "timeout">` — that attaches one-shot listeners for the `call-start`, `call-end`, and `error` events, races them against a `setTimeout` of `timeoutMs` (default `10000`, per research.md R6), removes all listeners once any one of them settles, and resolves `"timeout"` if none fired first. Export the default timeout as a named constant (e.g. `CONNECT_TIMEOUT_MS = 10000`) so the test in T022 doesn't hardcode a magic number.
- [X] T021 [US4] In `components/voice-overlay.tsx`, call `raceConnectionOutcome` alongside the existing `startVapiCall(HAPA_ASSISTANT_CONFIG)` call in the effect (lines 197–199). If it resolves `"timeout"`, call `setCallState("error")` (cancelled-guarded, same as the existing `handleError`/`handleCallEnd` paths) — this reuses the fallback UI already rendered for `callState === "error"` (lines 293–299, 304–321), so no new UI branch is needed, only the new transition into it. Satisfies FR-013.
- [X] T022 [P] [US4] Write `tests/voice-connection-timeout.test.ts` (Vitest, `vi.useFakeTimers()`): construct a fake event-emitter object shaped like the subset of the `Vapi` client's `on`/`removeListener` interface `raceConnectionOutcome` uses, call `raceConnectionOutcome` on it, advance fake timers past `CONNECT_TIMEOUT_MS` without ever emitting `call-start`/`call-end`/`error`, and assert the promise resolves `"timeout"`. Also assert it resolves `"call-start"` immediately (without waiting out the timeout) when that event fires first. Satisfies FR-020's requirement that the voice-connection timeout be covered by an automated test.

**Checkpoint**: User Stories 1–4 all work independently. A stalled voice connection reaches the typed-text fallback within 10 seconds, every time.

---

## Phase 7: User Story 5 - Give an Operator Something to Watch (Priority: P2)

**Goal**: Server-side errors are captured and retrievable by an operator without a shopper reporting them, with photo bytes/localStorage/credentials structurally scrubbed before any event leaves the process; SerpApi- and Vapi-quota-approaching signals surface through the same mechanism.

**Independent Test**: Deliberately trigger a server-side error and confirm a record of it (route, message, timestamp) is retrievable in the Sentry dashboard without any photo bytes, data URL, or `localStorage` content present.

### Implementation for User Story 5

- [X] T023 [US5] Add `@sentry/nextjs` as a dependency (`pnpm add @sentry/nextjs`) and scaffold `sentry.server.config.ts` and `sentry.client.config.ts` at the repo root per research.md R4, initializing each with `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` respectively (no-op / disabled when the corresponding DSN env var is unset, so local dev without a DSN doesn't error). Wrap `next.config.ts`'s export with `withSentryConfig`.
- [X] T024 [US5] Create `lib/sentry-scrub.ts` exporting a pure, directly-testable `scrubEvent(event: unknown): unknown | null` function implementing `contracts/operator-error-record.md`'s forbidden-content table: strip or null out any field containing what looks like a data URL (`data:image/...`) or object URL (`blob:...`), any request/response body on a `/api/vibe-photo` request, any value matching `localStorage` key names this app uses (`hapa.dna`, `hapa.billing`, `hapa.saved`, `hapa.listing-visits`), and any of `GROQ_API_KEY`/`SERPAPI_KEY`/`NEXT_PUBLIC_VAPI_PUBLIC_KEY`'s values if present verbatim anywhere in the event. Wire `scrubEvent` into both `sentry.server.config.ts` and `sentry.client.config.ts`'s `beforeSend`/`beforeBreadcrumb` hooks (from T023), and explicitly set the client SDK's local/session-storage capture integration to disabled — do not leave it at its default. Satisfies FR-016.
- [X] T025 [P] [US5] Write `tests/sentry-scrub.test.ts` (Vitest) against `lib/sentry-scrub.ts`'s `scrubEvent`: a synthetic Sentry event containing a `data:image/jpeg;base64,...` string, a `blob:` URL, a `GROQ_API_KEY`-shaped value, and a `localStorage`-key-named field are all stripped from the returned event, while an event containing only a message/stack/route/timestamp passes through unchanged. This is the concrete acceptance test for spec Acceptance Scenario US5.2 and `contracts/operator-error-record.md`'s Validation section.
- [X] T026 [P] [US5] Add a named Sentry breadcrumb/event (e.g. `"serpapi-quota-warning"`) fired from `lib/serpapi.ts`'s existing `data.error` branches (`fetchLiveProducts` at line 224, `fetchProductGallery` at line 313) when SerpApi's response indicates quota exhaustion — this is instrumentation only, not a change to either function's existing empty-array-on-failure behavior. Satisfies FR-017's product-search half (referenced from FR-011).
- [X] T027 [P] [US5] Add a named Sentry breadcrumb/event (e.g. `"vapi-quota-warning"`) fired from `components/voice-overlay.tsx`'s `handleError` (line 140) when the error text matches a Vapi/Daily quota-exhaustion pattern (mirroring the existing `isPermissionError` text-matching approach at lines 54–66) — instrumentation only, no change to the existing `denied`/`error` state transitions. Satisfies FR-017's voice half (FR-014).

**Checkpoint**: User Stories 1–5 all work independently. A deliberately thrown error in any API route produces a Sentry event; a synthetic event carrying photo/localStorage/credential content is provably scrubbed before it would be sent.

---

## Phase 8: User Story 6 - Trust That a Passing Build Actually Means Something (Priority: P2)

**Goal**: Build/test/lint run automatically on every push and PR and block merge on failure; `pnpm install --frozen-lockfile` succeeds on a clean checkout (verifying Phase 1's fix held).

**Independent Test**: Push a branch with a deliberately broken build to a PR and confirm GitHub Actions reports failure before merge; separately, confirm `pnpm install --frozen-lockfile` succeeds without modifying `pnpm-lock.yaml`.

### Implementation for User Story 6

- [X] T028 [US6] Create `.github/workflows/ci.yml` (GitHub Actions, research.md R2): triggers on `push` and `pull_request`; sets up Node (`>=20.9.0` per `package.json`'s `engines`) and `pnpm@11.2.2` (matching `packageManager`); runs `pnpm install --frozen-lockfile`, then `pnpm build`, `pnpm test`, and `pnpm lint` as separate steps so a failure in any one is individually visible. Satisfies FR-018.
- [X] T029 [US6] Verify Phase 1's lockfile fix holds end-to-end: on a clean checkout (fresh `node_modules`), run `pnpm install --frozen-lockfile && git diff --exit-code pnpm-lock.yaml` and confirm both succeed (no modification to the committed lockfile). This is the direct check for FR-019/SC-008 and should already pass given T001 — this task is the explicit verification, not new implementation.

**Checkpoint**: All six user stories are independently functional and verified. Pushing a broken build to a PR now visibly fails before merge.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Whole-feature validation and cleanup that spans multiple user stories.

- [X] T030 Run the full validation pass: `pnpm build && pnpm test && pnpm lint`, all three must pass — this is also what `.github/workflows/ci.yml` (T028) now runs on every push.
- [X] T031 Run the quickstart.md validation for each user story end-to-end (`specs/003-production-hardening/quickstart.md`), including manually inspecting `localStorage.getItem("hapa.listing-visits")` after two visits to the same product (US1) and grepping the built output for retired strings: `pnpm build && grep -rE "Order confirmed|Sent to email|checkout steps verified" .next/static || echo "clean"` — the direct check for SC-009.
- [X] T032 [P] Reconcile `SPEC.md`'s run-of-show language, which still describes "one confirmed checkout," with this feature's honest-link-out redefinition (noted in plan.md's Constitution Check as a recommended, non-blocking documentation follow-up under Principle I) — update the relevant passage(s) to describe the link-out behavior instead, or add a note pointing to this spec as the current behavior of record.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately. T001 blocks every task that runs `pnpm install`/`test`/`build` (effectively everything after it).
- **Foundational (Phase 2)**: None — see note above; proceed directly to Phase 3.
- **User Stories (Phase 3–8)**: All depend only on Phase 1. They touch disjoint files and can proceed in parallel if staffed, or sequentially in priority order (US1/US2/US3 → US4/US5/US6).
  - Exception: T026/T027 (US5) touch `lib/serpapi.ts` and `components/voice-overlay.tsx`, files US3 and US4 also modify — sequence US5's T026 after US3's changes land, and T027 after US4's T021 lands, to avoid a merge conflict (not a functional dependency).
- **Polish (Phase 9)**: Depends on all six user stories being complete.

### Within Each User Story

- US1: T003 (types) → T004 (pure helpers) → T005/T006 (deletions) → T007 (provider rewrite, needs T003+T004) → T008/T009 (UI, need T007) → T010 (sweep, needs T003–T009) → T011 (test, needs T004; can run parallel to T005–T010).
- US2: T012 → T013 (same file) → T014 (route, needs T012+T013) → T015 (needs T014) → T016 (parallel to T015, same file — do sequentially to avoid conflicting edits) → T017 (test, needs T012+T013; can run parallel to T014–T016).
- US3: T018 and T019 are independent of each other.
- US4: T020 → T021 (needs T020) → T022 (test, needs T020; parallel to T021).
- US5: T023 → T024 (needs T023) → T025 (test, needs T024) → T026/T027 (need T023 for the Sentry client, but are otherwise independent of T024/T025).
- US6: T028 and T029 are independent of each other; both benefit from T001 already being done.

### Parallel Opportunities

- T002 (Setup) is parallel to nothing else in Phase 1 (T001 must land first since both touch dependency state, though T002 only touches `.env.local.example`).
- Within US1: T004 [P] can start alongside T005/T006. T008 and T009 [P] can run together once T007 lands (different files). T011 [P] can run alongside T005–T010.
- Within US2: T014 [P] can start as soon as T012+T013 land, in parallel with nothing else mid-story (T015 needs T014). T016 [P] and T017 [P] can run alongside T015/T014 respectively.
- Once Phase 1 is done, US1, US2, and US3 (all P1) can be staffed in parallel; US4, US5, and US6 (all P2) likewise, modulo the US5/US3/US4 file-touch note above.

---

## Parallel Example: User Story 1

```bash
# After T003 (types) and T004 (pure helpers) land, these two can run together:
Task: "Update components/feed.tsx SavedCard/FeedCard to use visitFor/visitListing"
Task: "Update components/product-page.tsx to use visitFor/visitListing"

# T011's test can be written and run independently of the UI tasks above,
# as soon as T004's lib/listing-visits.ts exists:
Task: "Write tests/purchase-flow.test.ts against lib/listing-visits.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T002).
2. Complete Phase 3: User Story 1 (T003–T011).
3. **STOP and VALIDATE**: tap "Buy now" twice on the same product; confirm a real listing opens both times and `hapa.listing-visits` shows two timestamps, no simulated checkout anywhere.
4. This alone closes the audit's most severe correctness findings (fabricated "Order confirmed," fabricated receipt) and is deployable on its own.

### Incremental Delivery

1. Setup → Foundation ready (no separate foundational work needed here).
2. US1 → validate independently → deployable (MVP).
3. US2 → validate independently (two distinct photos → two distinct shifts) → deployable.
4. US3 → validate independently (`pnpm test` proves the fallback) → deployable.
5. US4 → validate independently (stalled connection → fallback within 10s) → deployable.
6. US5 → validate independently (triggered error → retrievable, scrubbed Sentry event) → deployable.
7. US6 → validate independently (broken PR build → visible CI failure) → now every prior story's tests run automatically on every push.
8. Polish (T030–T032).

---

## Notes

- [P] tasks touch different files and have no unmet dependency on an incomplete task.
- Every story-phase task cites the exact file(s) and, where the current codebase already has the relevant line numbers, the specific lines being replaced — re-check line numbers against the working tree before editing, since earlier tasks in the same story shift them.
- Tests are written to fail first only where practical (T011, T017, T022, T025, T018 all exercise code introduced earlier in the same or an already-complete phase); write the test immediately after the function/module it targets exists, then confirm it passes, rather than a strict red-green cycle across unrelated files.
- Commit after each task or logical group.
- Avoid introducing `@testing-library/react` or any new test runner — every test task here is written against a pure `lib/*` function or a directly-callable route handler, matching this project's existing Vitest-only pattern (research.md R5).
