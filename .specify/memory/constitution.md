# HAPA Constitution

HAPA is a voice-steerable, infinite shopping feed built for a 2-minute live hackathon
demo. Every principle below exists to serve one outcome: **the demo runs, on stage, on
venue WiFi, without a stumble.** `SPEC.md` is the authoritative implementation spec;
this constitution governs how we build against it.

## Core Principles

### I. The Demo Is the Product

Scope is judged against the 2-minute run of show in `SPEC.md` §13, not against product
completeness. A feature that does not appear on stage does not ship before one that
does. When effort must be cut, cut the thing the audience never sees.

### II. Every Network Path Has a Fallback (NON-NEGOTIABLE)

No live demo path may depend on a third party responding. SerpApi degrades to
`data/fallback_feed.json`; the LLM degrades to the rules-based query builder; voice
degrades to the `?debug=1` text bar. Every fallback is exercised before demo day — an
untested fallback does not count as a fallback.

### III. Never Fail Loudly

Route handlers return a valid, well-typed payload or a fallback payload; they never
return a non-2xx and never throw to the client. The feed never renders empty: on error,
keep the previous items and toast. Degraded output beats an error state on a projector.

### IV. Latency Is a Correctness Property

Outbound calls carry hard `AbortController` timeouts (SerpApi 6s, Groq 5s); no route
handler exceeds 8s. Client-side, a voice-triggered feed flush that has not resolved in
2.5s falls back to the local rules path so the visual lands on beat with the audio. A
correct result that arrives late has failed.

### V. Contracts Before Parallelism

`lib/types.ts` is the shared contract across all five workstreams and is frozen before
parallel work begins. No workstream edits files outside its scope in `SPEC.md` §11
without first updating `SPEC.md` §3 (Types) or §5 (API). Mocks are permitted to unblock
work, but must be swapped for real routes before integration.

## Technology Constraints

The stack is fixed for the duration of the hackathon and changes only by amendment:
Next.js 16.3 App Router, pnpm, Tailwind CSS v4, `motion`, `@vapi-ai/web`, Groq via
`groq-sdk`, SerpApi, Vercel. State lives in React Context and `localStorage` — no
database. Secrets are server-only and must never reach the client bundle.

Next.js 16 differs materially from older releases: consult
`node_modules/next/dist/docs/` before writing routes, layouts, or metadata rather than
relying on recalled API shapes.

## Development Workflow

Work is divided into the five workstreams in `SPEC.md` §11 and sequenced by the phase
gates in §12. Each phase has an explicit gate that must pass before the next begins, and
Phase 3 carries a hard cutoff: if voice is not working, ship the text bar and move to
polish.

`SPEC.md` §14 (Definition of Done) is the merge bar. `pnpm build` passing with zero
TypeScript errors is a precondition for any merge, not a follow-up task.

## Governance

This constitution supersedes ad-hoc practice. `SPEC.md` is the source of truth for what
is built; this document is the source of truth for how. Where the two conflict,
`SPEC.md` wins on detail and this document wins on principle.

Amendments require a PR that states the principle changed and the reason. During the
hackathon, any principle may be suspended by explicit agreement to save the demo —
suspensions are recorded in the PR description, not silently assumed.

Spec Kit artifacts under `specs/` are additive: they supplement `SPEC.md` and do not
replace it until a PR explicitly migrates it.

**Version**: 1.0.0 | **Ratified**: 2026-08-05 | **Last Amended**: 2026-08-05
