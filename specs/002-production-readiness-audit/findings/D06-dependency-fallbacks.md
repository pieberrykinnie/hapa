# D06 — Dependency Failure and Fallbacks

**Constitution**: Principle II (NON-NEGOTIABLE) — "Fallbacks MUST be exercised before demo day; an
untested fallback does not count."

**Verdict**: FAIL
**Basis**: The engineering underlying both fallback paths is genuinely well-built — every SerpApi
and Vapi failure mode resolves to a graceful degradation, confirmed by direct code reading. Both
FAIL anyway because Principle II is explicit that an unexercised fallback does not count, and
neither is exercised by any test in the repository.

## Findings

#### F-D06-01 — The SerpApi → curated-catalogue fallback is well-designed but has never been exercised by a test

- **Dimension**: D06
- **Severity**: S1 (blocks launch)
- **Kind**: INCORRECT
- **Verification**: NOT_EXERCISED
- **Free-tier feasible**: YES
- **Severity depends on assumption**: none

**Evidence**
1. `CODE` — `lib/serpapi.ts:11` — `TIMEOUT_MS = 6000`, enforced via a real `AbortController`
   (`lib/serpapi.ts:212-213,230`) — matches `SPEC.md:850`'s stated "SerpApi 6-second timeout".
2. `CODE` — `lib/serpapi.ts:200-201,224,227-228` — missing key, `FORCE_FALLBACK=1`, SerpApi error
   payload, and any thrown exception (timeout, network, malformed JSON) all resolve to `[]`.
3. `CODE` — `app/api/feed/route.ts` (`blendWithFallback`) — a `[]` or thin live batch is topped up
   from `FALLBACK_FEED` rather than shown as an empty or broken feed.
4. `COMMAND_OUTPUT` — `findings/_cmd-test.md` — none of the 4 test files
   (`billing-readiness.test.ts`, `local-onboarding.test.ts`, `onboarding-profile.test.ts`,
   `onboarding-suggestions.test.ts`) import from `lib/serpapi.ts`, `app/api/feed/route.ts`, or
   `lib/fallback-feed.ts`. Confirmed by test-file import inspection: zero references.

**Impact**
The one control standing between "SerpApi is down or the key is missing/quota-exhausted" and "the
shopper sees a broken or empty feed" has never actually been run and checked. The code reads
correctly, but per the constitution's own words, a fallback that has only been read, not exercised,
does not count as verified.

**Resolution condition**
An automated test drives `app/api/feed/route.ts` (or `fetchLiveResults`/`blendWithFallback`
directly) through a missing-key or forced-fallback condition and asserts the response still
contains a full page of usable products from `FALLBACK_FEED`.

**Blocked by**: none

---

#### F-D06-02 — The voice-call error/permission-denial fallback to typed text is well-designed but untested

- **Dimension**: D06
- **Severity**: S2
- **Kind**: INCORRECT
- **Verification**: NOT_EXERCISED
- **Free-tier feasible**: YES
- **Severity depends on assumption**: none

**Evidence**
1. `CODE` — `components/voice-overlay.tsx:54-66` — `isPermissionError` distinguishes a denied
   microphone from other failures.
2. `CODE` — `components/voice-overlay.tsx:128-142` — `handleCallEnd`/`handleError` route both
   permission denial and generic errors to a `denied`/`error` state.
3. `CODE` — `components/voice-overlay.tsx:293-322` — that state renders a typed-text fallback input
   wired to the same `applyVibeShift` the voice path uses.
4. `COMMAND_OUTPUT` — `findings/_cmd-test.md` — no test file imports `lib/vapi.ts` or
   `components/voice-overlay.tsx`.

**Impact**
Lower severity than F-D06-01: voice is a P2 (not P1) capability per `specs/001-voice-shopping-feed/spec.md`,
and the fallback is reachable by the shopper directly (typed input is visible and usable), unlike
the feed fallback which is invisible if it silently fails. Still an unverified control under
Principle II.

**Resolution condition**
An automated or scripted manual test forces a permission-denial and a generic Vapi error and
confirms the typed-text fallback appears and successfully applies a vibe shift in both cases.

**Blocked by**: none
