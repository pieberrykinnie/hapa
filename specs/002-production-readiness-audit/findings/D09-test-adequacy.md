# D09 — Test Adequacy on Critical Paths

**Verdict**: FAIL

## Findings

#### F-D09-01 — Zero test coverage on every money-adjacent and metered-quota-consuming path

- **Dimension**: D09
- **Severity**: S1 (blocks launch)
- **Kind**: MISSING
- **Verification**: VERIFIED
- **Free-tier feasible**: YES
- **Severity depends on assumption**: none

**Evidence**
1. `COMMAND_OUTPUT` — `findings/_cmd-test.md` — all 23 passing tests, across all 4 test files, are
   scoped to `lib/onboarding/local-store.ts` and `lib/onboarding/billing.ts` (profile/style/billing
   -readiness logic only).
2. `ABSENT_ARTIFACT` — no test imports or exercises `app/api/feed/route.ts`,
   `app/api/products/gallery/route.ts`, `lib/serpapi.ts` (the SerpApi-quota-consuming module — see
   D16), `lib/vapi.ts`, `components/purchase-flow.tsx`, `lib/purchase-agent.ts`, or
   `components/hapa-provider.tsx` (which holds all purchase-record state, per D02).

**Impact**
The two areas of the codebase that most directly touch money (checkout, however simulated today)
and metered external cost (product discovery against a capped free quota, per D16) have no
automated coverage at all. Nothing would catch a regression in either before it reached a shopper —
or, for the SerpApi path, before it silently burned through a scarce monthly quota faster than
expected.

**Resolution condition**
Automated tests cover the feed/fallback blending logic, the purchase confirm→complete state
machine, and the purchase-record write path, in addition to the existing onboarding coverage.

**Blocked by**: none — this is startable immediately against the code that exists today,
independent of F-D04-01's missing real payment execution (the simulated flow can and should be
tested as it stands).
