# D11 — Accessibility and Device Variation

**Verdict**: CONCERNS
**Basis**: The primary shopper journey shows genuinely good baseline accessibility hygiene, verified
directly in code, but nothing beyond static reading confirms it works for an actual assistive-technology
user, so key claims remain unverified rather than either passing or failing outright.

**What was verified**
- 50 `aria-*`/`role` attributes across `components/*.tsx` (grep count at audit time), including
  `aria-label` on every icon-only button reviewed (e.g. `components/purchase-flow.tsx:158`,
  `components/onboarding/ThisYouDeck.tsx:134-135`).
- Interactive elements are native `<button>`s throughout the reviewed components, not
  click-handled `<div>`s — confirmed in `components/feed.tsx`, `components/purchase-flow.tsx`,
  `components/onboarding/ThisYouDeck.tsx`.
- The "This you?" swipe deck has a full keyboard equivalent: `ArrowLeft`/`ArrowRight` commit a
  decision (`components/onboarding/ThisYouDeck.tsx:84-91`) in addition to the visible accept/reject
  buttons — a shopper is never required to perform a drag gesture.
- Microphone-permission denial degrades to a fully keyboard/typing-operable path: a labeled text
  input and "Apply" button replace the voice UI (`components/voice-overlay.tsx:293-322`), reached
  automatically via `isPermissionError` (`components/voice-overlay.tsx:54-66`).

**Gap**: `ABSENT_ARTIFACT` — no automated accessibility tooling (axe-core, jest-axe, Playwright a11y
checks) appears in `package.json` devDependencies, and no test exercises focus order,
screen-reader label correctness, or color contrast. These are reported `UNABLE_TO_ASSESS` rather
than passing, per spec FR-007 — static code review confirms the *intent* (labels, keyboard paths
exist) but not that they function correctly for a real assistive-technology user.

No blocking finding is filed: the observed gap is an absence of verification tooling, not a
demonstrated defect, and free-tier accessibility tooling (axe-core is open source) makes closing it
low-cost whenever it is picked up.
