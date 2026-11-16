# D03 — Private Media Lifecycle

**Constitution**: Principle VII (NON-NEGOTIABLE) — **Compliant** for the active photo-upload flow.

**Verdict**: PASS
**Basis**: The active photo path (`components/onboarding/ProfileSetup.tsx` +
`lib/onboarding/local-store.ts`) was traced end to end — consent, derivation, transport, retention,
and deletion — and each stage was verified rather than assumed:

- **Consent**: a checkbox gated behind "Use these image names to tune my starter feed." appears
  before any pending photo can be submitted (`components/onboarding/ProfileSetup.tsx:159-164`), and
  submission is blocked without it (`components/onboarding/ProfileSetup.tsx:78`).
- **What is derived**: `shoppingLabelsFromFileName` (`lib/onboarding/local-store.ts:386-408`) matches
  the filename against a fixed allow-list of shopping terms (jeans, sneakers, jackets, etc.) via
  regex — never the image content, never identity or biometric signals. `validatePhoto`
  (`lib/onboarding/rules.ts:19-26`) and the `SENSITIVE_PATTERNS` guard
  (`lib/onboarding/rules.ts:13-17,61-69`) actively reject race/ethnicity/biometric/age/identity
  terms from ever reaching a suggestion.
- **Transport**: no `fetch`/`XMLHttpRequest` call in `ProfileSetup.tsx` or `local-store.ts` ever
  sends photo bytes anywhere; `prepareLocalPhoto` (`lib/onboarding/local-store.ts:198-233`) resizes
  and re-encodes entirely in an in-browser `<canvas>`.
- **Retention bound**: `MAX_LOCAL_PHOTOS = 5` and `MAX_PHOTO_BYTES = 10MB`
  (`lib/onboarding/local-store.ts:15`, `lib/onboarding/constants.ts:3`) cap what accumulates in
  `localStorage`.
- **Deletion**: `removePhoto` (`components/local-onboarding-app.tsx:85-91`) filters the photo out
  and calls `persist`, which writes the updated (photo-free) state immediately — confirmed to
  actually remove the stored `dataUrl`, not just hide it in the UI.
- **Disclosure matches behavior**: "Filename cues stay on this device. Images are never uploaded."
  (`components/onboarding/ProfileSetup.tsx:167`) is an accurate description of the verified behavior
  above.

No finding is filed against this dimension. One related observation belongs to a different
dimension by the frozen scope split (D13 covers what a shopper reads on screen; D14 covers
repository documentation): the *separate* in-feed "Show hapa a vibe" quick-shift photo tool
(`components/photo-vibe-overlay.tsx`) does **not** meet this same bar for honest disclosure — see
**F-D13-01**. And a documentation claim about this same active flow's "visual features" diverges
from what the code does — see **F-D14-03**. Both are cross-referenced here because they concern
photo handling, but they are findings about disclosure and documentation, not about privacy or data
handling itself, which is what this dimension assesses.
