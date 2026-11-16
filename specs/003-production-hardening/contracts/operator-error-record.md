# Contract: Operator Error Record (US5)

**Status**: Frozen for Phase 2 task breakdown, per Constitution Principle V.

Governs the Sentry configuration (`sentry.*.config.ts`) that satisfies spec FR-015/FR-016/FR-017.
This is the concrete answer to the `principle_conflict` the audit flagged on `F-D10-01`: adding
observability must not become a Principle VII violation.

## What MUST be captured (spec FR-015)

- Every unhandled exception in `app/api/feed/route.ts`, `app/api/products/gallery/route.ts`, and
  the new photo-analysis route (`contracts/groq-vision-analysis.md`).
- Error message, stack trace, the route or component name, a timestamp, and the deployed
  release/commit identifier.
- HTTP method and route path, and the response status code — enough to diagnose *what* failed and
  roughly *when*, per spec User Story 5's independent test.
- A named event when SerpApi's or Vapi's usage approaches its allowance (spec FR-011/FR-014/FR-017)
  — a breadcrumb or custom event distinct from an exception, so an operator can find it without
  waiting for an actual outage.

## What MUST NOT be captured (spec FR-016) — enforced via Sentry's `beforeSend`/`beforeBreadcrumb` hooks

| Forbidden content | Where it could otherwise leak from |
|---|---|
| Photo bytes, data URLs, or object URLs | `components/photo-vibe-overlay.tsx`, `components/onboarding/ProfileSetup.tsx`, `lib/groq-vision.ts` |
| Any `localStorage` value (style profile, `ListingVisit` records, billing preference) | Sentry's default browser SDK behavior can capture local/session storage snapshots on error — this **must be explicitly disabled**, not left at a default. |
| Full request or response bodies for the photo-analysis route | The request body *is* the photo. |
| `GROQ_API_KEY`, `SERPAPI_KEY`, `NEXT_PUBLIC_VAPI_PUBLIC_KEY`, or any other credential value | Standard secret-scrubbing hygiene; Sentry's SDK has built-in patterns for this that must be verified active, not assumed. |

**Enforcement point**: a single `beforeSend` hook (server config) and a corresponding client-side
hook strip or reject any event matching the forbidden list above, before it leaves the process —
the same "structural enforcement, not developer discipline" principle `002`'s finding schema used
for Principle VII, applied here to a live system instead of a static document.

## Free-tier fit (research.md R4)

Sentry's free tier (5,000 errors/month) comfortably covers this project's five-user launch target;
no paid tier is required for this contract to hold.

## Validation

A task in Phase 2 must include: deliberately triggering an error inside the photo-analysis route
with a real (test) photo in flight, and confirming the resulting Sentry event contains no trace of
that photo's bytes or URL — this is the concrete acceptance test for spec Acceptance Scenario US5.2.
