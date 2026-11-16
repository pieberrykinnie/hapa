# D02 — Authoritative State and Data Ownership

**Verdict**: FAIL
**Basis**: Every category of state the launch target requires to be authoritative — identity,
preferences, payment status, and order history — lives exclusively in browser `localStorage` with
no server-side counterpart of any kind.

## Findings

#### F-D02-01 — All state, including full purchase history, is device-local only

- **Dimension**: D02
- **Severity**: S1 (blocks launch)
- **Kind**: MISSING
- **Verification**: VERIFIED
- **Free-tier feasible**: YES
- **Severity depends on assumption**: none

**Evidence**
1. `CODE` — `lib/onboarding/local-store.ts:14` — `LOCAL_ONBOARDING_KEY = "hapa.onboarding.v1"`,
   the sole persistence key for name, photos, style profile, and payment preference.
2. `CODE` — `components/hapa-provider.tsx:29-32` — a second, parallel set of `localStorage` keys
   (`hapa.dna`, `hapa.billing`, `hapa.saved`, `hapa.purchases`) used by the live `AppShell`.
3. `CODE` — `components/hapa-provider.tsx:493-503` — `purchases`, the entire order history, is
   written only via `saveJSON(PURCHASES_STORAGE_KEY, next)` — never sent to a server.
4. `ABSENT_ARTIFACT` — no database client, ORM, or `/api/*` write endpoint exists for profile,
   preference, or order data anywhere in the repository.

**Impact**
Clearing browser storage, switching browsers, or switching devices permanently and silently erases
a shopper's entire profile and order history with no recovery path. The launch target requires
identity, payment status, and orders to use authoritative storage the shopper's browser cannot
unilaterally destroy.

**Resolution condition**
Identity, style preferences, payment-method readiness, and order records are persisted server-side
and survive the shopper's local browser storage being cleared.

**Blocked by**: none

---

#### F-D02-02 — Repeat purchase of the same product silently overwrites the earlier order record

- **Dimension**: D02
- **Severity**: S2
- **Kind**: INCORRECT
- **Verification**: VERIFIED
- **Free-tier feasible**: YES
- **Severity depends on assumption**: none

**Evidence**
1. `CODE` — `components/hapa-provider.tsx:135` — `purchases: Record<string, PurchaseRecord>` is
   keyed by `product.id`, not by a unique order identifier.
2. `CODE` — `components/hapa-provider.tsx:493-503` — each completed purchase writes
   `purchases[active.product.id] = { orderRef, purchasedAt }`, replacing any prior entry for that
   same product.
3. `CODE` — `components/purchase-flow.tsx:266-272` — the UI itself offers a "Buy another" action
   that re-triggers `requestPurchase(order.product)` for the identical product, guaranteeing this
   collision is reachable in normal use.

**Impact**
A shopper who buys the same item twice (a real, expected shopping pattern — restocking a
consumable, buying a gift twice) permanently loses the first order's reference the moment the
second completes, even within the same session on the same device. Order history is not merely
absent server-side (F-D02-01); the client-side record itself cannot represent more than one order
per product.

**Resolution condition**
Purchasing the same product a second time creates a second, independently retrievable order record
rather than overwriting the first.

**Blocked by**: none

---

#### F-D02-03 — A second, unreachable identity/billing state system duplicates the active one

- **Dimension**: D02
- **Severity**: S2
- **Kind**: INCORRECT
- **Verification**: VERIFIED
- **Free-tier feasible**: YES
- **Severity depends on assumption**: none

**Evidence**
1. `CODE` — `app/page.tsx:1-5` — the only reachable entry point renders `LocalOnboardingApp`.
2. `CODE` — `components/local-onboarding-app.tsx:150-151` — `AppShell` is rendered only after
   `if (!dna) return null;`, i.e. only ever with a non-null `initialDNA`.
3. `CODE` — `components/hapa-provider.tsx:130` — `HapaProvider`'s `screen` state initializes to
   `initialDNA ? "feed" : "identity"`; given evidence #2, `screen` always starts at `"feed"`.
4. `CODE` — `components/app-shell.tsx:36-38` — `OnboardingIdentity`, `Onboarding`, and
   `OnboardingBilling` render only when `screen` is `"identity"`, `"swipe"`, or `"billing"` — states
   nothing in the reachable code path ever sets.
5. `CODE` — `components/onboarding-identity.tsx`, `components/onboarding.tsx`,
   `components/onboarding-billing.tsx` — three full screens, plus `lib/onboarding-cards.ts`, exist
   solely to serve this unreachable state machine, with their own `hapa.dna`/`hapa.billing`
   `localStorage` keys duplicating `hapa.onboarding.v1`'s job.

**Impact**
Not a live risk today — this code cannot execute via the shipped entry point. But it is a second,
divergent implementation of identity, style calibration, and billing capture sitting dormant in the
codebase. A future edit to `app/page.tsx` or `local-onboarding-app.tsx` (e.g. an accidental prop
change) could silently reactivate it, producing two competing sources of truth for the same data at
once.

**Resolution condition**
Either the dead onboarding-identity/onboarding/onboarding-billing path is removed, or it is wired up
as the single source of truth and `LocalOnboardingApp`'s duplicate implementation is retired —
exactly one identity/billing state system remains reachable in the codebase.

**Blocked by**: none
