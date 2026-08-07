# Contract: Groq Vision Analysis (US2)

**Status**: Frozen for Phase 2 task breakdown, per Constitution Principle V.

Governs `lib/groq-vision.ts`, the module `components/photo-vibe-overlay.tsx` calls to replace the
retired `PHOTO_DEMO_SHIFT` constant.

## Interface

```text
analyzePhotoForVibe(photo: File): Promise<VibeShift | null>
```

Returns `null` on any failure (missing key, timeout, malformed response, output rejected by the
safety filter) — mirroring `lib/serpapi.ts`'s and `lib/vapi.ts`'s existing empty-return-on-failure
convention, never a thrown exception the caller must remember to catch.

## Request

- Model: `qwen/qwen3.6-27b` (research.md R1; matches `SPEC.md:868`'s already-declared choice).
- Mode: Groq JSON mode, prompted to return an object shaped like `VibeShift`
  (`add_keywords: string[]; remove_keywords: string[]; dealbreakers: string[]`).
- The photo is sent once, as image content in the request. **Never written to any HAPA-controlled
  storage, log, or database at any point** — it exists in memory for the duration of this one call.
- API key: `GROQ_API_KEY`, read server-side only (this call happens from a server context, not the
  browser — see "Where this runs" below), following the exact pattern `lib/serpapi.ts`'s
  `SERPAPI_KEY` already establishes: never imported by a `"use client"` module.

## Where this runs

The existing `photo-vibe-overlay.tsx` is a client component; the photo must reach `GROQ_API_KEY`
without exposing it to the browser. This module is called from a new, minimal server-side path
(a route handler, following the same shape as `app/api/feed/route.ts`) — not embedded in client
code. The photo is transmitted from the browser to that route, then from the route to Groq; it is
still never persisted, only relayed.

## Timeout

**5000ms**, enforced via `AbortController`, exactly matching `lib/serpapi.ts`'s
`TIMEOUT_MS`/`AbortController` pattern (`lib/serpapi.ts:11,212-213,230`) and `SPEC.md:850`'s
already-stated "photo analysis 5 seconds before generic fallback." A timeout resolves to `null`,
never to a partial or fabricated result.

## Output validation (spec FR-007)

Before a non-null result is returned, every string in `add_keywords`, `remove_keywords`, and
`dealbreakers` is checked against the same sensitive-content rule family
`lib/onboarding/rules.ts`'s `SENSITIVE_PATTERNS` already applies to the (currently dormant)
photo-suggestion path:

- Reject the entire result (return `null`) if any keyword matches a pattern naming race, ethnicity,
  religion, disability, sexuality, pregnancy, biometric signals, gender identity, face recognition,
  medical/health condition, age, or an attempt to identify a specific person.
- Accept only shopping-relevant vocabulary — colors, materials, silhouettes, aesthetics, activity/
  category terms — consistent with what every other `VibeShift` producer in this codebase already
  outputs.

## Failure handling (spec FR-008, FR-009)

| Failure | Caller behavior |
|---|---|
| `GROQ_API_KEY` missing | Returns `null` immediately — no request attempted. |
| Network error / timeout | Returns `null`. |
| Malformed / non-JSON response | Returns `null`. |
| Output fails the safety filter above | Returns `null` — this is treated as a failure, not a partial success. |
| `null` returned to the caller | `photo-vibe-overlay.tsx` shows an honest failure state and offers the existing typed-text vibe input as a fallback — it does **not** fall back to `PHOTO_DEMO_SHIFT` or any other fixed substitute, because that constant no longer exists after this feature. |

## Consent copy (spec FR-023)

The overlay's pre-submission copy must state the photo is sent to a server-side analysis service.
The specific wording is a task-level detail; the binding requirement is that no on-device-only or
"never uploaded" claim may appear anywhere in this feature's copy once this contract is implemented.
