# Implementation Plan: Production Readiness Audit

**Branch**: `002-production-readiness-audit` | **Date**: 2026-08-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-production-readiness-audit/spec.md`

## Summary

Produce an evidence-backed audit of what stands between this repository and a real launch, judged
against a launch target the user has now narrowed: **free-tier infrastructure only, roughly five
real users**.

That constraint does not soften the audit — it redirects it. Scale, throughput, and
high-availability concerns fall away at five users. In their place comes a class of blocker that a
funded launch would never hit: free tiers carry *quota ceilings* and *licensing terms*, and this
repository's intended behavior collides with both. Phase 0 research established two concrete
examples before a line of the audit was written (Vercel Hobby forbids payment processing; SerpApi
free allows 250 searches/month against a feed that can spend 3 per page). Neither is a code defect.
Both are launch blockers.

The approach is a single-pass, read-only assessment across a frozen registry of 16 readiness
dimensions, each producing findings against a fixed schema so that the report is comparable across
runs. The dimension registry and finding schema are frozen in `contracts/` before any dimension is
audited, satisfying Constitution Principle V, because the dimensions are intended to be worked in
parallel.

## Technical Context

The audit is a document, not a program. Two technical contexts matter: the subject under
assessment, and the method used to assess it.

### Subject under assessment

**Language/Version**: TypeScript 5, React 19.2.8, Node >= 20.9.0

**Primary Dependencies**: Next.js 16.3.0 (App Router, webpack build), `@vapi-ai/web` 2.6.1 (browser
voice), `framer-motion` 12, Tailwind CSS 4

**Storage**: Browser `localStorage` only. No database, no server-side persistence, no object
storage. Declared **Prototype Mode** in `specs/001-voice-shopping-feed/spec.md`.

**External services**: SerpApi (server-side product discovery, `SERPAPI_KEY`), Vapi (browser voice,
`NEXT_PUBLIC_VAPI_PUBLIC_KEY`)

**Testing**: Vitest 3.2.4 — 4 unit test files covering onboarding and billing readiness logic

**Target Platform**: Vercel (per constitution), browser client

**Project Type**: Web application (Next.js App Router; 2 API routes, ~6.3k LOC across
`app/`, `components/`, `lib/`, `tests/`)

**Scale/Scope**: ~5 real users. 16 audit dimensions over ~6.3k LOC, 2 API routes, 2 external
service integrations, 0 CI workflows.

**Constraints (launch target)**: Free service tiers exclusively. This is a hard constraint on
remediation, which means it is also a scoring input for the audit: a finding whose only fix costs
money is a blocker, not a recommendation.

### Method

**Approach**: Static read-only review of the repository at a recorded commit, plus non-mutating
local verification commands (`pnpm build`, `pnpm test`, `pnpm lint`) whose results are recorded as
evidence.

**Deliverable**: `audit-report.md` in this feature directory, structured per `contracts/`.

**Performance Goals**: Not applicable — the deliverable is a document. The *subject's* latency
commitments are assessed under dimension D12.

**Non-goals**: No code changes, no dependency upgrades, no configuration edits. Remediation is
separate downstream work (spec FR-031).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

Assessed against HAPA Constitution v2.1.0.

| Principle | Applies to this feature? | Gate outcome |
|-----------|--------------------------|--------------|
| I. The Demo Is the Product | Yes | **PASS** — The audit changes no demo path. It consumes zero runtime budget and cannot displace a staged journey. It reports on the run of show without altering it. |
| II. Every Network Path Has a Safe Outcome | As subject only | **PASS** — Introduces no network path. Assessing every existing fallback is required work under D06. |
| III. Never Fail Loudly or Falsely | Yes, to the audit itself | **PASS** — The principle's spirit binds the report: spec FR-007 forbids recording a pass from absent evidence, and FR-009 forbids scoring an unexercised control as working. An audit that overstates readiness is the same failure mode this principle names. |
| IV. Latency Is a Correctness Property | As subject only | **PASS** — No latency surface added. The subject's timeout behavior is assessed under D12. |
| V. Contracts Before Parallelism | **Yes, directly** | **PASS** — The dimensions are designed to be audited in parallel, so the finding schema and dimension registry are frozen in `contracts/` as Phase 1 output, before any dimension work begins. A dimension may not invent its own severity levels or finding fields. |
| VI. A Human Authorizes Every Purchase | As subject only | **PASS** — The audit executes no purchase path and modifies none. D04 assesses every path that can result in a charge. |
| VII. Profile Photos Are Private Inputs | **Yes, directly** | **PASS with a binding constraint** — The audit traces photo handling but MUST NOT copy image data, image-derived personal content, or any real shopper's personal data into the report. Findings cite code locations and data flows, never payloads. Recorded as a method constraint in `quickstart.md` and enforced by the finding schema, which has no field for captured data. |
| Technology Constraints (Next.js 16 docs) | Yes | **PASS** — Any finding asserting that a Next.js API is misused MUST cite `node_modules/next/dist/docs/`. Version-specific claims from memory are not evidence. |
| Local Prototype Exception | Yes | **PASS** — Prototype Mode is a declared, permitted state. Per spec Assumptions, the audit reports what that choice costs at the launch target rather than scoring a deliberate decision as a defect. |
| Development Workflow (`pnpm build` clean is the merge bar) | Yes | **PASS** — The audit adds no source code, so the bar is met trivially; running it is itself evidence for D08. |
| Governance (`SPEC.md` wins on features, constitution on safety) | Yes | **PASS** — Where `SPEC.md` and the constitution disagree on a safety question, the audit follows the constitution and records the divergence as a finding. |

**Gate result: PASS.** No violations to justify; Complexity Tracking is therefore omitted.

### Post-Phase-1 re-check

Re-evaluated after generating `data-model.md`, `contracts/`, and `quickstart.md`. Still **PASS**.
The design strengthened two gates rather than eroding them: Principle V is now enforced by a frozen
registry file rather than an intention, and Principle VII is now structurally enforced — the
finding schema in `contracts/finding-schema.md` provides no field capable of holding captured
personal data, so honoring the constraint is the path of least resistance rather than an act of
discipline.

### One spec delta introduced by this plan

The user's free-tier constraint arrived after the spec was written. It introduces a readiness
concern the spec's required-coverage list does not name: whether a chosen service tier's **quota
ceiling** and **licensing terms** permit the intended production use. Spec FR-021 (dependency
failure paths) and FR-030 (supply chain) each touch an edge of this but neither covers it.

This plan adds **D16 — Service-Tier Viability** to close the gap. Under Principle V the contract
changes first, so the spec was amended before the dimension was registered, not after: **`spec.md`
now carries FR-035**, covering service-tier terms and quota viability, with wording derived in
`research.md` (R6). The spec's Assumptions section was amended in the same pass, because its
original statement of the launch target predated the free-tier constraint and would otherwise have
contradicted this plan.

Both amendments are recorded in the spec itself with an "Amended 2026-08-05 during planning" note,
so the change is auditable rather than silent.

## Project Structure

### Documentation (this feature)

```text
specs/002-production-readiness-audit/
├── plan.md                        # This file
├── spec.md                        # Feature specification
├── research.md                    # Phase 0 output
├── data-model.md                  # Phase 1 output
├── quickstart.md                  # Phase 1 output — how to run and validate the audit
├── contracts/
│   ├── dimension-registry.md      # Frozen: the 16 dimensions and their scope boundaries
│   ├── finding-schema.md          # Frozen: required fields for every finding
│   └── report-structure.md        # Frozen: the report's section order and verdict rules
├── checklists/
│   └── requirements.md            # Spec quality checklist (complete)
├── tasks.md                       # Phase 2 output (/speckit-tasks — NOT created here)
├── findings/                      # Phase 3 working output — one fragment per dimension
│   ├── D01-identity-session.md    #   ... through D16-service-tier-viability.md
│   └── _*.md                      #   provenance and captured command output
└── audit-report.md                # The deliverable (produced by /speckit-implement)
```

**Why `findings/` exists**: the 16 dimensions are designed to be assessed in parallel, but the
report is a single file. Each dimension therefore writes its own fragment first, and an assembly
step merges them in registry order. Without this, "parallel" would be nominal — 16 tasks contending
for one file. The fragments are a **Phase 3 snapshot**, retained afterwards as working evidence;
once assembly completes, `audit-report.md` is the single authoritative artifact and later enrichment
passes edit only that file.

### Source code (repository root)

The audit reads this tree and writes nothing to it:

```text
app/
├── api/
│   ├── feed/route.ts              # D06, D07, D12, D16 — SerpApi discovery + fallback blending
│   └── products/gallery/route.ts  # D06, D16 — per-product photo fetch, one billed call each
├── layout.tsx, page.tsx, manifest.ts, globals.css

components/
├── onboarding*.tsx, onboarding/   # D01, D02, D03, D13 — identity, photo, calibration
├── billing/                       # D04, D13 — payment-method readiness display
├── purchase-flow.tsx              # D04, D05 — the charge path
├── voice-overlay.tsx              # D11, D12 — microphone permission and voice UX
├── hapa-provider.tsx              # D02 — localStorage-backed app state
└── feed.tsx, product-*.tsx        # D06, D11

lib/
├── serpapi.ts                     # D06, D12, D16 — timeouts, query rotation, quota consumption
├── vapi.ts                        # D06, D12, D16 — voice session lifecycle
├── purchase-agent.ts              # D04 — agent-side purchase preparation
├── onboarding/local-store.ts      # D02, D03 — the device-local source of truth
└── fallback-feed.ts, gallery.ts, vibe-parser.ts, types.ts

tests/                             # D09 — 4 unit files; coverage assessed against critical paths
```

**Structure Decision**: No source structure is chosen or changed — this feature adds no code. The
tree above is annotated with the dimensions that will examine each area, so that the Phase 2 task
breakdown can be cut by dimension without two tasks silently claiming the same file. The audit's
own output lives entirely under `specs/002-production-readiness-audit/`.

## Execution Phases

Phase 0 and Phase 1 are complete (this command). Phase 2 onward is `/speckit-tasks` and
`/speckit-implement`.

| Phase | Output | Status |
|-------|--------|--------|
| 0 — Research | `research.md`: launch-target definition, severity calibration, free-tier facts, method | **Complete** |
| 1 — Design & contracts | `data-model.md`, `contracts/*`, `quickstart.md` | **Complete** |
| 2 — Task breakdown | `tasks.md`, cut by dimension | `/speckit-tasks` |
| 3 — Execution | `audit-report.md` | `/speckit-implement` |

## Complexity Tracking

Not applicable — the Constitution Check passed with no violations requiring justification.
