# Implementation Plan: Production Hardening — Decide What's Real

**Branch**: `003-production-hardening` | **Date**: 2026-08-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-production-hardening/spec.md`

## Summary

Close every launch-blocking finding from `specs/002-production-readiness-audit/` that survives
three explicit scope decisions made before this spec was written: no in-app payment simulation
("Buy now" becomes a real link to the real listing instead), real photo-vibe analysis instead of a
faked one, and identity/persistence deliberately left device-local. The technical approach is
almost entirely subtractive and additive-of-tests rather than additive-of-infrastructure: retire the
fake purchase-agent subsystem, wire one new external call (Groq vision) behind the same
timeout-and-fallback discipline the codebase already uses for SerpApi and Vapi, add a CI workflow
and error-monitoring service both of which are free at this project's scale, add a bounded voice
timeout, and add tests for paths the audit found untested. No database, no authentication, no new
hosting target — this stays a static-friendly Next.js app on Vercel's free tier, now honestly so.

## Technical Context

**Language/Version**: TypeScript 5, React 19.2.8, Node >= 20.9.0 (unchanged from `002`'s subject)

**Primary Dependencies**: Next.js 16.3.0 (App Router), `@vapi-ai/web` 2.6.1, `framer-motion`,
Tailwind CSS 4 — all existing. New: a Groq API client for the vision call (R1), Sentry's Next.js SDK
for error monitoring (R4). No new UI framework, no new state-management library.

**Storage**: Unchanged — browser `localStorage` remains the only persistence layer (spec FR-021).
The retired purchase-record store is replaced by a smaller `ListingVisit` record in the same
storage, not by a database.

**Testing**: Vitest (existing), extended per R5 to cover `lib/serpapi.ts`'s fallback path,
`app/api/feed/route.ts`, the merchant-link behavior, and the voice-connection timeout — no new
testing framework.

**Target Platform**: Vercel (unchanged), browser client. Remains free-tier-viable specifically
*because* US1 retires in-app payment processing — the audit's F-D16-02 (Vercel Hobby forbids
commercial use) is resolved by this feature removing the conflicting capability, not by migrating
hosts.

**Project Type**: Web application (Next.js App Router) — unchanged structure, two existing API
routes plus no new routes required (Groq is called server-side from within the existing
photo-vibe-shift interaction, not a new route; see data-model.md).

**Performance Goals**: Every new or newly-bounded external call carries a hard timeout consistent
with the project's existing discipline: SerpApi 6s (existing, unchanged), photo analysis 5s (`SPEC.md:850`'s
already-stated target, now actually enforced against a real call), voice connect 10s (R6, new).

**Constraints**: Free-tier infrastructure only, ~5 users (carried forward from `002`'s launch
target — this feature is scoped explicitly to make that target achievable). Every new dependency
(Groq, Sentry, GitHub Actions) was checked against this constraint in Phase 0 and found to fit
comfortably, unlike `002`'s SerpApi/Vercel/Vapi findings.

**Scale/Scope**: 6 user stories, 23 functional requirements, touching roughly a dozen existing
files (`lib/purchase-agent.ts` retired; `components/purchase-flow.tsx`, `components/photo-vibe-overlay.tsx`,
`lib/vapi.ts`, `components/voice-overlay.tsx`, `lib/serpapi.ts`, `app/api/feed/route.ts`,
`components/hapa-provider.tsx` modified) plus new: a Groq client module, a Sentry configuration, a
GitHub Actions workflow, and several new test files.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

Assessed against HAPA Constitution v2.1.0.

| Principle | Applies? | Gate outcome |
|---|---|---|
| I. The Demo Is the Product | Yes | **PASS, with a noted divergence.** `SPEC.md`'s run of show includes "one confirmed checkout" — this feature deliberately replaces that with an honest external handoff instead. This is the user's explicit, deliberate scope decision (see spec Overview), not an oversight, and it is exactly the kind of "cut unshown breadth before weakening the demonstrated journey" tradeoff Principle I anticipates — except here the demonstrated journey itself is being redefined toward honesty rather than cut. `SPEC.md` is not updated by this plan (it remains the aspirational full-production reference, same as it already diverges from `001`'s Prototype Mode); a follow-up documentation task to reconcile `SPEC.md`'s run-of-show language is recommended but not blocking. |
| II. Every Network Path Has a Safe Outcome (NON-NEGOTIABLE) | Yes | **PASS, strengthened.** This feature's primary mechanism for closing `F-D06-01` is adding the test Principle II already requires ("an untested fallback does not count"). The new Groq call and the tightened voice-connect path both get the same timeout-and-fallback treatment SerpApi already has. No network path this feature touches is left without a bounded failure mode. |
| III. Never Fail Loudly or Falsely | Yes | **PASS — this is this feature's central purpose.** Retiring the fabricated checkout receipt (`F-D05-01`) and the fabricated photo-analysis claim (`F-D13-01`) are the two highest-severity items this feature closes. |
| IV. Latency Is a Correctness Property | Yes | **PASS.** Photo analysis gets `SPEC.md:850`'s already-stated 5-second budget (R1), voice connection gets a new bounded 10-second budget (R6). Neither timeout is permitted to silently convert into a false success — both resolve to the existing honest-failure/fallback UI. |
| V. Contracts Before Parallelism | Yes | **PASS.** `data-model.md` (Phase 1) freezes the shape of the retired `Order`/`PurchaseStage` types' replacement (`ListingVisit`) and the new `VibePhotoAnalysis` type before task breakdown, so stories that touch shared types (US1, US2) don't independently diverge. |
| VI. A Human Authorizes Every Purchase (NON-NEGOTIABLE) | Yes, but **not-yet-applicable rather than violated** | **PASS.** This feature performs no HAPA-brokered purchase at all — it hands every product off to "an explicit external-merchant handoff," which the constitution's own Identity, Media, and Commerce Constraints section already permits for "products without a supported checkout contract." After this feature, that describes every product, not a subset — an extension of an existing allowance, not a new exception. Principle VI's specific machinery (agent prepares cart, shopper confirms total, provider authorizes) has nothing to govern until a future feature reintroduces HAPA-brokered checkout. |
| VII. Profile Photos Are Private Inputs (NON-NEGOTIABLE) | Yes, directly, and **this gated a spec amendment** | **PASS, after amendment.** Real photo analysis (US2) means a photo leaves the device for the first time — the audit's D03 PASS rested specifically on that never happening. Spec FR-023 was added during this Constitution Check (see spec.md's amendment note) requiring the photo-vibe-shift feature's disclosure to honestly state the photo is now sent to a server-side service, scoped so the still-accurate onboarding photo disclosure is untouched. FR-007 additionally carries forward the existing no-biometric/no-identity constraint to the new analysis path. |
| Technology Constraints (Next.js 16 docs) | Yes | **PASS.** Route-handler behavior for R5's test approach was confirmed against `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`. |
| Local Prototype Exception | Yes | **PASS, unchanged.** Spec FR-021/FR-022 keep this feature inside the exception's boundaries — no authenticated storage added, no real checkout enabled. |
| Development Workflow / Definition of Done | Yes | **PASS, directly served.** This feature is what makes "`pnpm build` passing is a precondition for merge" mechanically true for the first time (US6) rather than aspirationally true. |

**Gate result: PASS.** One documented amendment (spec FR-023) made before Phase 1 design began, per
Principle V. One noted, deliberate divergence from `SPEC.md`'s run-of-show language (Principle I),
recorded rather than silently absorbed. No violation requires a Complexity Tracking justification.

### Post-Phase-1 re-check

Re-evaluated after `data-model.md`, `contracts/`, and `quickstart.md` were written. Still **PASS**.
The `VibePhotoAnalysis` contract in particular now structurally enforces FR-007/FR-023 rather than
relying on the analysis prompt alone: the type has no field capable of carrying identity or
biometric content, and the consent-copy requirement is captured as a concrete UI-copy check in
`quickstart.md` rather than left implicit.

## Project Structure

### Documentation (this feature)

```text
specs/003-production-hardening/
├── plan.md              # This file
├── spec.md              # Feature specification (amended with FR-023 during planning)
├── research.md           # Phase 0 output
├── data-model.md          # Phase 1 output
├── quickstart.md          # Phase 1 output
├── contracts/
│   ├── groq-vision-analysis.md   # Contract for the new Groq call (request/response shape, timeout, failure handling)
│   ├── listing-visit.md          # Contract for the retired-purchase-record replacement
│   └── operator-error-record.md  # Contract for what may/must-not appear in a captured error
├── checklists/
│   └── requirements.md    # Spec quality checklist (amended, still 16/16)
└── tasks.md               # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source code (repository root)

No new top-level directories. Existing structure, annotated with what this feature touches:

```text
app/
├── api/
│   ├── feed/route.ts               # US3 — gains fallback test coverage (no behavior change)
│   └── products/gallery/route.ts   # unchanged
sentry.*.config.ts                  # NEW — R4, Sentry Next.js SDK convention

components/
├── purchase-flow.tsx               # US1 — ConfirmSheet/AgentRun retired, replaced with a link-out confirmation
├── photo-vibe-overlay.tsx          # US2 — PHOTO_DEMO_SHIFT replaced with a real Groq call; consent copy updated (FR-023)
├── voice-overlay.tsx               # US4 — connection timeout added
├── hapa-provider.tsx               # US1 — `purchases` map replaced by `ListingVisit` records; purchase-agent timers removed
└── feed.tsx, product-page.tsx      # US1 — "Buy now" wired to the link-out behavior

lib/
├── purchase-agent.ts                # US1 — REMOVED
├── vapi.ts                          # US4 — connection timeout wrapper added
├── serpapi.ts                       # US3 — no behavior change, gains test coverage
├── groq-vision.ts                   # NEW — US2, R1: the Groq client and structured-output extraction
└── onboarding/rules.ts              # reference pattern for FR-007's output validation, not modified

.github/workflows/
└── ci.yml                           # NEW — US6, R2: build/test/lint on every push and PR

tests/
├── feed-fallback.test.ts            # NEW — US3, R5
├── purchase-flow.test.ts            # NEW — US1
├── photo-vibe-analysis.test.ts      # NEW — US2
└── voice-connection-timeout.test.ts # NEW — US4
```

**Structure Decision**: No new architectural layer. This feature is scoped to modify existing files
in place, remove one module (`lib/purchase-agent.ts`) and its dead-code-adjacent UI, and add one new
library module (`lib/groq-vision.ts`) following the exact shape of the existing `lib/serpapi.ts` and
`lib/vapi.ts` (server-only API key, hard timeout, empty/fallback return on any failure) — the
project already has an established pattern for "call an external service safely," and this feature
reuses it rather than inventing a new one.

## Execution Phases

Phase 0 and Phase 1 are complete (this command). Phase 2 onward is `/speckit-tasks` and
`/speckit-implement`.

| Phase | Output | Status |
|---|---|---|
| 0 — Research | `research.md`: vision model, CI provider, lockfile fix, error monitoring, test approach, voice timeout | **Complete** |
| 1 — Design & contracts | `data-model.md`, `contracts/*`, `quickstart.md` | **Complete** |
| 2 — Task breakdown | `tasks.md`, cut by user story | `/speckit-tasks` |
| 3 — Execution | Working code, passing CI | `/speckit-implement` |

## Complexity Tracking

Not applicable — the Constitution Check passed with no violations requiring justification. The one
spec amendment (FR-023) and one noted divergence (Principle I vs. `SPEC.md`'s run of show) are
documented above rather than requiring a complexity-tracking entry, since neither is a constitution
violation — the first closes a gap the constitution requires closed, and the second is a disclosed,
deliberate scope decision the constitution's own Principle I anticipates weighing.
