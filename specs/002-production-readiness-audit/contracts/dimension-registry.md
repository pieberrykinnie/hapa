# Contract: Readiness Dimension Registry

**Status**: FROZEN as of 2026-08-05 | **Authority**: Constitution Principle V

This registry is the shared contract that lets dimensions be audited in parallel without drifting.
Per Constitution Principle V, it changes **before** dependent work, not during it. An auditor who
finds the boundaries wrong stops and amends this file rather than reinterpreting a scope locally.

Every dimension produces exactly one verdict. There are exactly 16, always — a run reporting a
different number is invalid, because cross-run comparability (spec SC-011) depends on the set being
fixed.

**Launch target for all scope judgments**: free tiers only, ~5 real users, real money assumed in
scope. See [research.md](../research.md) §R1.

---

## Safety and correctness

### D01 — Identity and Session Integrity
**Spec**: FR-016
**In scope**: Whether a shopper can be identified across sessions and devices; whether personal
data and purchase history attach to an account rather than a browser; session establishment,
validation, and termination; what "sign out" actually removes.
**Out of scope**: Choice of authentication vendor (remediation, per R4).
**Primary surfaces**: `components/onboarding-identity.tsx`, `components/hapa-provider.tsx`
**Note**: The prototype has no authentication. Expect `kind = MISSING` findings scored against the
launch target, not bug reports.

### D02 — Authoritative State and Data Ownership
**Spec**: FR-017
**In scope**: Where the source of truth lives for identity, preferences, payment status, and
orders; what a shopper loses by clearing browser storage; whether device-local state is presented
as durable; multi-device and multi-session behavior.
**Out of scope**: Database schema design (remediation).
**Primary surfaces**: `lib/onboarding/local-store.ts`, `components/hapa-provider.tsx`

### D03 — Private Media Lifecycle
**Spec**: FR-018 | **Constitution**: Principle VII (NON-NEGOTIABLE)
**In scope**: Consent before upload; what is derived from a photograph; every hop the image data
takes; retention and deletion; whether the shopper can preview, replace, and remove it; whether
any analysis strays toward identity or protected traits.
**Out of scope**: Image-processing quality.
**Primary surfaces**: `components/onboarding/ProfileSetup.tsx`, `components/photo-vibe-overlay.tsx`,
`lib/onboarding/`
**Binding constraint**: No image data or image-derived personal content may be reproduced in the
report.

### D04 — Purchase Authorization
**Spec**: FR-019 | **Constitution**: Principle VI (NON-NEGOTIABLE)
**In scope**: Every path that can result in a charge; whether explicit human confirmation of the
exact item, total, and payment method precedes it; whether a confirmation can be reused for a
different total; duplicate-submission protection; idempotency of order creation.
**Out of scope**: Payment provider selection (remediation).
**Primary surfaces**: `components/purchase-flow.tsx`, `lib/purchase-agent.ts`,
`components/billing/`

### D05 — Truthful Outcome Reporting
**Spec**: FR-020 | **Constitution**: Principle III
**In scope**: Whether any authentication, payment, or order outcome can be shown as more successful
or more certain than it is; how pending, failed, canceled, and unknown states surface; whether a
timeout can become a false success.
**Primary surfaces**: `components/purchase-flow.tsx`, `components/billing/BillingReadiness.tsx`

### D13 — Disclosure Accuracy
**Spec**: FR-028
**In scope**: Whether user-facing claims match reality — statements about accounts, security, where
data lives, and which payment methods are available. Includes the constitution's Prototype Mode
labeling obligations.
**Out of scope**: Copy tone and visual design.
**Primary surfaces**: `components/onboarding*.tsx`, `components/billing/`

---

## Resilience and operations

### D06 — Dependency Failure and Fallbacks
**Spec**: FR-021 | **Constitution**: Principle II (NON-NEGOTIABLE)
**In scope**: Behavior when each external service fails, times out, returns malformed data, refuses
for quota, or lacks a key; whether a declared fallback exists; **whether it has actually been
exercised** — an unexercised fallback is `NOT_EXERCISED`, never `VERIFIED`.
**Out of scope**: Provider-side reliability.
**Primary surfaces**: `lib/serpapi.ts`, `lib/vapi.ts`, `lib/fallback-feed.ts`,
`app/api/feed/route.ts`

### D07 — Secrets and Configuration
**Spec**: FR-022
**In scope**: Whether any secret is reachable from the browser; server/client boundary correctness
for every environment variable; whether required configuration is documented and validated at
startup; behavior when a variable is missing.
**Primary surfaces**: `.env.local.example`, `lib/serpapi.ts`, `lib/vapi.ts`
**Known starting point**: four variables are referenced in code (`SERPAPI_KEY`,
`NEXT_PUBLIC_VAPI_PUBLIC_KEY`, `FORCE_FALLBACK`, `NODE_ENV`); the example file documents one.

### D10 — Operability and Incident Response
**Spec**: FR-025
**In scope**: Whether a production failure would be noticed at all; what an operator can see and
do; error surfacing and logging; rollback path.
**Out of scope**: Paid observability platforms beyond free-tier feasibility judgment.

### D12 — Latency Budget Enforcement
**Spec**: FR-027 | **Constitution**: Principle IV
**In scope**: Whether the project's own timing commitments are enforced with real timeouts; whether
an expired budget can be converted into a false success; voice-shift responsiveness.
**Out of scope**: Load-driven latency (deferred by scale, per R2).
**Primary surfaces**: `lib/serpapi.ts` (`TIMEOUT_MS`), `lib/vapi.ts`, `app/api/feed/route.ts`

### D16 — Service-Tier Viability
**Spec**: FR-035 (added 2026-08-05, see [research.md](../research.md) §R6) | **Added by**: the
free-tier constraint
**In scope**: For every external service — whether its **terms permit the intended production
use**, and whether its **quota accommodates ~5 users for a full billing period**. Findings must
quantify expected consumption per user journey rather than asserting sufficiency. Also covers
free-tier feasibility of closing capability gaps found in D01, D02, D03, and D04.
**Out of scope**: Vendor selection; negotiating terms.
**Known starting point** (R3): SerpApi free is 250 searches/month with a 50/hour cap against a feed
costing 1–3 searches per page plus 1 per gallery open; Vercel Hobby forbids commercial use
including payment processing; Vapi has credits rather than a free tier.
**Standing rule**: every quota or pricing claim carries its retrieval date.

---

## Engineering discipline

### D08 — Automated Quality Gates
**Spec**: FR-023
**In scope**: Whether build, type-check, lint, and test run without depending on a person
remembering; branch protection; whether the constitution's "`pnpm build` clean is the merge bar" is
mechanically enforced.
**Known starting point**: no `.github/` directory exists.

### D09 — Test Adequacy on Critical Paths
**Spec**: FR-024
**In scope**: Coverage measured against paths carrying money, personal data, and irreversible
actions — not as an aggregate percentage. Whether each declared fallback has a test.
**Out of scope**: Coverage-percentage targets, which the spec explicitly rejects as the measure.
**Known starting point**: 4 unit test files, concentrated on onboarding and billing readiness.

### D11 — Accessibility and Device Variation
**Spec**: FR-026
**In scope**: The primary shopper journey by keyboard and screen reader; the experience when
microphone permission is denied, dismissed, or unavailable; touch versus pointer interactions such
as swipe-based calibration; viewport variation.
**Primary surfaces**: `components/voice-overlay.tsx`, `components/onboarding/ThisYouDeck.tsx`,
`components/add-vibe-radial.tsx`

### D14 — Documentation and Operator Onboarding
**Spec**: FR-029, and **FR-010** (added 2026-08-05 — see amendment note below)
**In scope**: Whether a new operator can configure, run, and deploy from the documentation present;
accuracy of setup instructions. **Also carries FR-010**: disagreements between documented behavior
and actual behavior — including `SPEC.md` and `specs/001-voice-shopping-feed/spec.md` against what
the code does — are recorded as `DOC_CONFLICT` findings with the actual behavior treated as
authoritative.
**Out of scope**: User-facing claims shown in the product interface, which belong to D13. The split
is *where the claim lives*: D13 covers what a shopper reads on screen, D14 covers what a contributor
reads in the repository.
**Known starting point**: `README.md` is the unmodified `create-next-app` template and documents a
port the project does not use.

### D15 — Supply Chain and Reproducibility
**Spec**: FR-030
**In scope**: Version pinning and lockfile integrity; reproducibility of an install; known-vulnerable
or unmaintained dependencies; whether the declared package manager and Node version are enforced.
**Primary surfaces**: `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`

---

## Coverage map

Every required-coverage requirement in the spec maps to exactly one dimension.

| Spec FR | Dimension | | Spec FR | Dimension |
|---------|-----------|---|---------|-----------|
| FR-016 | D01 | | FR-024 | D09 |
| FR-017 | D02 | | FR-025 | D10 |
| FR-018 | D03 | | FR-026 | D11 |
| FR-019 | D04 | | FR-027 | D12 |
| FR-020 | D05 | | FR-028 | D13 |
| FR-021 | D06 | | FR-029 | D14 |
| FR-022 | D07 | | FR-030 | D15 |
| FR-023 | D08 | | FR-035 | D16 |

The map above covers the spec's *Required coverage* group only. One requirement from the
*Evidence and honesty* group is also dimension-carried rather than schema-enforced:

| Spec FR | Dimension | Note |
|---------|-----------|------|
| FR-010 | D14 | Documented-vs-actual divergence, surfaced as `DOC_CONFLICT` evidence |

The remaining honesty requirements (FR-006, FR-007, FR-008, FR-009) are enforced by the finding
schema and the Phase 7 validation pass rather than by any single dimension.

**Amendment rule**: changing a scope boundary, adding a dimension, or removing one requires
updating this file and the coverage map above **before** the affected dimension is audited, and
noting the change in the report's provenance section. Dimensions may not be silently merged or
split — cross-run comparability depends on stable IDs.

### Amendment log

| Date | Change | Reason |
|------|--------|--------|
| 2026-08-05 | D16 added | The free-tier constraint introduced service-tier terms and quota viability, which no existing dimension covered. Spec FR-035 added first. |
| 2026-08-05 | D14 scope extended to carry FR-010; D13/D14 boundary stated explicitly | `/speckit-analyze` finding C2: FR-010 had zero coverage and the `DOC_CONFLICT` evidence type could not be produced by any task. Amended before any dimension was audited, as this rule requires. |
