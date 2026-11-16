# D01 — Identity and Session Integrity

**Verdict**: FAIL
**Basis**: No authentication mechanism exists anywhere in the active code path. "Identity" in the
running app is a first-name string typed into a form and held in `localStorage`. This is a real,
correctly-disclosed gap against the launch target (Prototype Mode is a permitted exception per the
constitution's Local Prototype Exception, and no code claims to be authenticated), not a silent
defect — but it blocks the launch target as defined in research.md §R1.

## Findings

#### F-D01-01 — No authentication exists; identity is an unauthenticated device-local name

- **Dimension**: D01
- **Severity**: S1 (blocks launch)
- **Kind**: MISSING
- **Verification**: VERIFIED
- **Free-tier feasible**: YES
- **Severity depends on assumption**: none

**Evidence**
1. `CODE` — `app/page.tsx:1-5` — the entire app entry point renders `LocalOnboardingApp` with no
   sign-in step.
2. `CODE` — `components/onboarding/ProfileSetup.tsx:98-108` — the only "identity" collected is a
   free-text display name with no verification.
3. `CODE` — `lib/onboarding/local-store.ts:180-188` — `saveLocalOnboarding` writes the entire
   profile straight to `window.localStorage`, unauthenticated.
4. `ABSENT_ARTIFACT` — no auth provider, session cookie, middleware, or `/api/auth*` route exists
   anywhere in `app/` or `lib/`.

**Impact**
Nothing ties a shopper's profile, preferences, or purchase history to a verifiable identity. Two
people sharing a browser share one profile; the same person on two devices has two unrelated
profiles with no way to reconcile them. There is no way to build "sign in and your data follows
you" — the launch target's baseline expectation.

**Resolution condition**
A shopper can authenticate via a maintained provider, and their profile, style preferences, and
purchase history are attributable to that verified identity rather than to a browser.

**Blocked by**: none
