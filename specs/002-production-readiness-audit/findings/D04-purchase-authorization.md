# D04 — Purchase Authorization

**Constitution**: Principle VI (NON-NEGOTIABLE)

**Verdict**: FAIL
**Basis**: Exactly one path in the codebase can result in a purchase completing:
`components/purchase-flow.tsx`'s `ConfirmSheet` → `confirmPurchase()`
(`components/hapa-provider.tsx:456-517`). It was traced exhaustively — `requestPurchase` is called
only from `components/app-shell.tsx:59,69` and `components/purchase-flow.tsx:268`, and
`confirmPurchase` is called only from the "Confirm purchase" button
(`components/purchase-flow.tsx:89`). **For the one path that exists, Principle VI's structural
requirement — the shopper must explicitly confirm the exact item and total before purchase — is
genuinely met**: `requestPurchase` always sets `stage: "confirm"` first
(`components/hapa-provider.tsx:437-447`), the confirm sheet displays item, merchant, price, and
payment method (`components/purchase-flow.tsx:42-84`), and nothing bypasses that gate. This
dimension still FAILs because the capability the gate protects — a real purchase — does not exist.

## Findings

#### F-D04-01 — No real purchase execution exists; the entire checkout path is a client-side simulation

- **Dimension**: D04
- **Severity**: S1 (blocks launch)
- **Kind**: MISSING
- **Verification**: VERIFIED
- **Free-tier feasible**: UNKNOWN
- **Severity depends on assumption**: real money moving at launch (research.md §R1). If the launch
  in fact handles no real transactions, this finding does not block launch.

**Evidence**
1. `CODE` — `lib/purchase-agent.ts:1-10` — the module's own comment: "DEMO SCOPE: this simulates
   the agent locally on a timer. No browser is driven, no merchant site is contacted, and no money
   moves."
2. `CODE` — `components/hapa-provider.tsx:456-517` — `confirmPurchase` schedules
   `window.setTimeout` steps entirely client-side; no `fetch` call to any payment or merchant API
   occurs anywhere in the function.
3. `CODE` — `lib/purchase-agent.ts:27-29` — `makeOrderRef()` returns
   `` `HAPA-${Math.random()...}` `` — a random string, not an identifier issued by any real order
   system.
4. `ABSENT_ARTIFACT` — no payment-provider SDK (Stripe, Braintree, etc.) appears in
   `package.json` dependencies; no `/api/checkout*` or `/api/payment*` route exists.

**Impact**
The confirm-before-purchase control (Principle VI) has nothing real to protect yet. A shopper who
completes this flow has not bought anything, even though the UI (see **F-D05-01**) tells them they
have. Real agent-assisted checkout — the launch target's core commerce capability — does not exist.

**Resolution condition**
Confirming a purchase triggers a real payment authorization through an integrated provider, and a
real, retrievable order is created only after that authorization succeeds.

**Blocked by**: F-D01-01 (an order needs a real identity to belong to), F-D02-01 (an order needs
authoritative server-side storage to survive), F-D16-02 (the current deployment target's free tier
prohibits payment processing outright — see D16).
