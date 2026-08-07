# D12 — Latency Budget Enforcement

**Constitution**: Principle IV ("Latency Is a Correctness Property")

**Verdict**: FAIL
**Basis**: The product-discovery path enforces a real, correct timeout. The voice-connection path
does not, and that gap is what drives the FAIL verdict.

## Findings

#### F-D12-01 — Voice connection has no client-side timeout; a stalled connect can hang indefinitely with no fallback

- **Dimension**: D12
- **Severity**: S1 (blocks launch)
- **Kind**: MISSING
- **Verification**: VERIFIED
- **Free-tier feasible**: YES
- **Severity depends on assumption**: none

**Evidence**
1. `CODE` — `lib/vapi.ts:31-34` — `startVapiCall` awaits the Vapi SDK's `start()` with no
   `AbortController`, timer, or race against a deadline.
2. `CODE` — `components/voice-overlay.tsx:103-142` — the `"connecting"` state transitions only on
   the SDK's own `call-start`, `call-end`, or `error` events; there is no client-side timer that
   forces a transition if none of those fire.
3. `CODE` — `components/voice-overlay.tsx:46-52` — `STATUS_LABEL.connecting = "connecting…"` is the
   only UI shown while in this state, with no elapsed-time indication or manual "give up" affordance
   beyond the always-present close button.

**Impact**
On a stalled network or an unresponsive Vapi/Daily session, a shopper can be left staring at
"connecting…" with no automatic path to the typed-text fallback that exists for every *other*
voice-failure mode (permission denial, explicit errors — see D06). This directly contradicts
Principle IV: "Discovery, analysis, and interpretation calls MUST have hard timeouts and fast
fallbacks."

**Resolution condition**
A bounded client-side timer (e.g. matching or informed by the constitution's discovery-path
timeouts) forces the overlay out of `"connecting"` into the existing error/fallback state if no
SDK event arrives in time.

**Blocked by**: none

---

**Positive evidence** (does not offset the FAIL verdict, since one S1 finding is sufficient to fail
the dimension, but is real and worth recording): `lib/serpapi.ts:11` sets `TIMEOUT_MS = 6000`,
enforced via a genuine `AbortController` (`lib/serpapi.ts:212-213,230`), matching the exact figure
`SPEC.md:850` states ("SerpApi 6-second timeout"). A timeout here never converts into a false
success — an aborted call simply returns `[]` and blends with the fallback catalogue (see D06).
