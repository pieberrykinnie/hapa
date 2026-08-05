<!--
Sync Impact Report
- Version change: 1.0.0 -> 2.0.0
- Modified principles:
  - I. The Demo Is the Product -> expanded to cover authenticated onboarding and checkout
  - II. Every Network Path Has a Fallback -> financial and authentication paths now fail closed
  - III. Never Fail Loudly -> financial outcomes must never be simulated as successful
  - IV. Latency Is a Correctness Property -> checkout gets separate safety-oriented timing rules
  - V. Contracts Before Parallelism -> shared contracts now include identity, media, and commerce
- Added principles:
  - VI. A Human Authorizes Every Purchase
  - VII. Profile Photos Are Private Inputs
- Added sections: Identity, Media, and Commerce Constraints
- Removed sections: none
- Follow-up TODOs: none
-->
# HAPA Constitution

HAPA is an authenticated, voice-steerable shopping feed built for a fast live demonstration.
It learns a shopper's taste from an optional profile photo and five explicit choices, then lets
an agent prepare supported purchases for the shopper's final approval. Every principle below
serves two outcomes: the experience works on stage, and no financial or personal-data shortcut
can misrepresent what happened.

## Core Principles

### I. The Demo Is the Product

Scope MUST be judged against the run of show in `SPEC.md`, including sign-in, profile setup,
the “This you?” calibration, payment-method readiness, feed steering, and one confirmed checkout.
A feature that does not appear on stage MUST NOT displace a required demo path. When effort must
be cut, cut unshown breadth before weakening the demonstrated journey.

### II. Every Network Path Has a Safe Outcome (NON-NEGOTIABLE)

Product discovery, photo analysis, language interpretation, and voice paths MUST have explicit
fallbacks. Authentication and payments MUST fail closed: HAPA may preserve session context or
offer retry, but MUST NOT invent an authenticated session, a configured payment method, an order,
or a successful charge. Fallbacks MUST be exercised before demo day; an untested fallback does
not count.

### III. Never Fail Loudly or Falsely

Recoverable failures MUST preserve the last useful screen and show a concise next action. The
feed MUST never render empty when eligible cached or curated products exist. Financial failures
MUST show their real pending, failed, canceled, or unknown state and MUST never be displayed as
successful merely to protect the demo.

### IV. Latency Is a Correctness Property

Discovery, analysis, and interpretation calls MUST have hard timeouts and fast fallbacks. A voice
shift that arrives too late has failed even if its content is correct. Checkout is different:
HAPA MUST show progress and an idempotent retry path, but MUST NOT convert an unknown payment or
order state into success because a latency target expired.

### V. Contracts Before Parallelism

Shared contracts for identity, profile media, Style DNA, catalog products, checkout sessions,
orders, and payment-method readiness MUST be frozen before dependent workstreams begin. No
workstream may silently change a shared contract or cross-workstream API; the corresponding
contract sections in `SPEC.md` MUST change first.

### VI. A Human Authorizes Every Purchase (NON-NEGOTIABLE)

The agent MAY select a supported offer, resolve missing options with the shopper, prepare a cart,
calculate totals, and populate shipping details. It MUST present the exact item, variant, merchant,
quantity, subtotal, discounts, shipping, tax, total, destination, and payment method before
purchase. The shopper MUST explicitly confirm that review, and the selected payment provider MUST
complete its own required authorization. HAPA MUST NOT buy in the background, reuse confirmation
for another total, or store raw card or wallet credentials.

### VII. Profile Photos Are Private Inputs (NON-NEGOTIABLE)

Photo upload MUST be optional and based on informed consent. Analysis MUST be limited to
shopping-relevant visual signals such as colors, garments, materials, silhouettes, accessories,
and aesthetics. HAPA MUST NOT perform face recognition, create biometric templates, identify a
person, or infer protected or sensitive traits. Shoppers MUST be able to skip upload, preview and
remove the photo, understand how it affects recommendations, and delete stored photo data.

## Technology Constraints

The application uses Next.js 16.3 App Router, pnpm, Tailwind CSS v4, `motion`, browser-based voice,
server-side product discovery, an optional language model, and Vercel deployment. Next.js 16
differs materially from older releases; contributors MUST consult `node_modules/next/dist/docs/`
before writing routes, layouts, metadata, authentication boundaries, or request handlers.

Account-backed state replaces the previous device-only profile model. Identity, profile data,
derived style signals, onboarding progress, and order history MUST use authenticated storage.
Small non-authoritative UI preferences MAY be cached locally, but local state MUST NOT be the
source of truth for identity, payment status, or orders.

## Identity, Media, and Commerce Constraints

- Authentication MUST use a maintained provider and secure server-validated sessions.
- Uploaded photos MUST use private object storage, validated file types and size limits, signed
  access, deletion controls, and no public-by-default URLs.
- The application MUST store payment-provider customer and method references only; it MUST NOT
  receive or persist raw card numbers, wallet credentials, or security codes.
- Payment methods MUST be displayed according to real device, browser, country, currency,
  merchant, and order eligibility. “Configured” MUST NOT imply universally available.
- Agent-assisted checkout is limited to HAPA-supported seller or catalog integrations. Products
  without a supported checkout contract MUST use an explicit external-merchant handoff.
- Order creation and payment confirmation MUST be idempotent and auditable.
- Secrets and privileged service credentials MUST remain server-only.

## Development Workflow

Work is divided into the workstreams and phase gates defined in `SPEC.md`. Identity and shared
contracts land before profile, feed, voice, or commerce consumers. Payment work MUST use provider
test mode until the full review-and-confirm journey, duplicate-submission protection, cancellation,
failure, and unknown-state recovery paths pass.

`SPEC.md` Definition of Done is the merge bar. `pnpm build` passing with zero TypeScript errors is
a precondition for merge. Security-sensitive changes to authentication, photo handling, checkout,
payment webhooks, or order state MUST receive an explicit review against Principles VI and VII.

## Governance

This constitution supersedes ad-hoc practice. `SPEC.md` is the source of truth for what is built;
this document is the source of truth for how. Where the two conflict, `SPEC.md` wins on feature
detail and this constitution wins on safety and governance.

Amendments require a change that states the principle or constraint affected and the reason.
Semantic versioning applies: a major version removes or incompatibly redefines governance, a minor
version adds or materially expands principles, and a patch clarifies without changing obligations.
Compliance with the current constitution MUST be reviewed during planning and before merge.

Spec Kit artifacts under `specs/` supplement `SPEC.md`; they do not replace it until an explicit
migration says so.

**Version**: 2.0.0 | **Ratified**: 2026-08-05 | **Last Amended**: 2026-08-05
