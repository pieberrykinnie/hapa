# Quickstart: Validating Production Hardening

**Date**: 2026-08-06 | **Plan**: [plan.md](./plan.md)

How to run this feature's changes and confirm each user story's independent test, once implemented.
This is a validation guide, not an implementation walkthrough — data shapes live in
[data-model.md](./data-model.md), external-call behavior lives in [contracts/](./contracts/).

## Prerequisites

```bash
pnpm install
```

(No longer `--frozen-lockfile`-only-fails — closing `F-D15-01`/US6 is part of this feature; if the
lockfile is still broken when this is run, that task isn't done yet.)

New environment variables this feature introduces, beyond the existing `SERPAPI_KEY` and
`NEXT_PUBLIC_VAPI_PUBLIC_KEY`:

```dotenv
GROQ_API_KEY=              # server-only — contracts/groq-vision-analysis.md
SENTRY_DSN=                # server-side error capture
NEXT_PUBLIC_SENTRY_DSN=    # client-side error capture — a DSN is a destination identifier, not a secret, per Sentry's own docs
```

`.env.local.example` must list all of these by the time US6 is done (closing part of the audit's
`F-D07-01`).

## Validating each user story

### US1 — Honest checkout

```bash
pnpm dev
```

1. Open the feed, tap "Buy now" on any card.
2. **Expected**: a new browser tab opens to that product's real merchant URL
   (`Product.link`). No in-app confirmation screen, no "Order confirmed," no receipt.
3. Return to HAPA, tap "Buy now" on the *same* product again.
4. **Expected**: per `contracts/listing-visit.md`, the earlier visit is not lost — inspect
   `localStorage.getItem("hapa.listing-visits")` and confirm the product's `openedAt` array now has
   two entries, not one overwritten entry (this is the direct check for the fixed `F-D02-02`).
5. Grep the built output for retired strings, confirming SC-009:
   ```bash
   pnpm build && grep -rE "Order confirmed|Sent to email|checkout steps verified" .next/static || echo "clean"
   ```

### US2 — Real photo-vibe analysis

1. Open "Show hapa a vibe," submit a photo dominated by warm earth tones. Note the resulting feed
   shift's keywords.
2. Repeat with a photo dominated by cool, saturated neon colors.
3. **Expected**: the two shifts differ (SC-002) — unlike the retired `PHOTO_DEMO_SHIFT`, which was
   identical every time.
4. Read the consent copy shown before submission and confirm it states the photo is sent to a
   server-side service (spec FR-023) — no "never uploaded" language should remain anywhere in this
   specific feature's copy.
5. Set `GROQ_API_KEY` to an invalid value temporarily and repeat step 1.
6. **Expected**: an honest failure state appears with the typed-text fallback offered, per
   `contracts/groq-vision-analysis.md`'s failure table — not a fixed substitute shift.

### US3 — Feed resilience and quota safety

```bash
pnpm test
```

**Expected**: the new fallback test (`tests/feed-fallback.test.ts`, per research.md R5) passes,
proving `app/api/feed/route.ts` still returns a full page from `FALLBACK_FEED` when `SerpApi` is
unavailable — this is the automated proof `F-D06-01` required and never had.

For SC-004 (quota headroom), this is a measurement task, not a one-shot test: instrument or manually
tally SerpApi calls across a representative session and confirm the count stays under 80% of
250/month and 50/hour at the expected shopper volume.

### US4 — Voice connection timeout

1. Open voice steering with network conditions that prevent the connection from ever completing
   (e.g. browser dev tools' offline/throttling mode applied after the microphone prompt).
2. **Expected**: after 10 seconds (research.md R6), the interface automatically shows the same
   fallback UI already used for a denied microphone or a connection error — not an indefinite
   "connecting…" state.

### US5 — Operator error record

1. Deliberately trigger a server-side error (e.g. a temporary throw added to a route handler during
   testing).
2. Check the Sentry project dashboard.
3. **Expected**: an event appears with route, message, and timestamp. Per
   `contracts/operator-error-record.md`'s validation task, also trigger an error mid-photo-analysis
   and confirm the resulting event contains no photo bytes, data URL, or `localStorage` snapshot.

### US6 — Automated quality gates

1. Push a branch with a deliberately broken build (e.g. a TypeScript error) to a PR.
2. **Expected**: the GitHub Actions workflow (research.md R2) reports failure on the PR before
   anyone merges it.
3. On a clean checkout:
   ```bash
   pnpm install --frozen-lockfile && echo "SUCCESS"
   ```
   **Expected**: succeeds without modifying `pnpm-lock.yaml` — this is the direct check for the
   fixed `F-D15-01`.

## Full validation pass

```bash
pnpm build && pnpm test && pnpm lint
```

All three must pass — and now, per US6, this is also what the CI workflow runs on every push.
