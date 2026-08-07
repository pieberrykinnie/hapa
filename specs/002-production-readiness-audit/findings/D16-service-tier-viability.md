# D16 — Service-Tier Viability

**Verdict**: FAIL
**Basis**: All three external services this repository depends on were checked against the
free-tier launch target. Two fail outright; the third degrades safely but is a hard, non-renewing
ceiling with no monitoring to warn before it's hit. These are re-derived and verified independently
of `research.md` §R3, not copied from it, per the audit method.

## Findings

#### F-D16-01 — SerpApi's free-tier quota does not cover normal feed usage at the launch target's scale

- **Dimension**: D16
- **Severity**: S1 (blocks launch)
- **Kind**: INCORRECT
- **Verification**: VERIFIED
- **Free-tier feasible**: NO
- **Severity depends on assumption**: none

**Evidence**
1. `EXTERNAL_TERMS` — https://serpapi.com/pricing — free plan: 250 searches/month, 50/hour
   throughput cap. Retrieved 2026-08-05.
2. `CODE` — `lib/serpapi.ts:19` — `MAX_QUERY_ATTEMPTS = 3`.
3. `CODE` — `lib/serpapi.ts:145-179` — `fetchLiveResults` issues the primary query alone first;
   only when the batch is thin (`stillThin`, line 170) does it fan out the remaining variants in
   parallel via `Promise.all` (line 172-174) — so one feed page (`PAGE_SIZE = 12`,
   `app/api/feed/route.ts`) costs 1 to 3 billed SerpApi searches depending on result thinness.
4. `CODE` — `app/api/products/gallery/route.ts:9-16` — one additional billed search every time a
   shopper opens a product's detail page (confirmed by the route's own comment: "a distinct, billed
   SerpApi request").

**Impact**
At the worst case of 3 searches/page, the entire monthly allowance covers roughly 83 feed pages
across *all* users combined — before any product detail view is counted. The 50/hour cap is
tighter still: one engaged shopper scrolling continuously can exhaust it alone, well within an
ordinary browsing session. This ceiling is monthly and global, not per-user, so five users hit it
exactly as fast as five hundred would — the free-tier constraint does not scale down with the
five-user assumption the way infrastructure-load concerns do.

**Resolution condition**
Measured consumption for a representative five-user month fits within the plan's quota with
headroom, or a paid SerpApi tier is budgeted, or per-request consumption is reduced (e.g. by
raising `MIN_BATCH_BEFORE_ROTATE` less aggressively, or caching non-personalized query results
within safe bounds).

**Blocked by**: none

---

#### F-D16-02 — Vercel's free (Hobby) tier prohibits the commercial use the launch target requires

- **Dimension**: D16
- **Severity**: S0 (blocks launch under the real-money assumption — a provider terms-of-service
  conflict, an explicit S0 criterion in the severity scheme)
- **Kind**: MISSING
- **Verification**: VERIFIED
- **Free-tier feasible**: NO
- **Severity depends on assumption**: real money moving at launch (research.md §R1). Under the
  narrower "closed testing, no real transactions" reading, Vercel Hobby hosting is not itself a
  blocker.

**Evidence**
1. `EXTERNAL_TERMS` — https://www.promptstoproduct.com/vercel-free-tier-limits — Vercel's Hobby
   plan is restricted to non-commercial, personal use; fair-use guidance explicitly names
   "processing payment" as a disqualifying commercial activity. Retrieved 2026-08-05.
2. `CODE` — `.specify/memory/constitution.md:83-84` — "The application uses Next.js 16.3 App
   Router... and Vercel deployment," naming Vercel as the deployment target.
3. Cross-reference — F-D04-01 (real payment execution is a launch-target requirement).

**Impact**
If real checkout is ever activated (required to close F-D04-01), running it on Vercel's free tier
would violate that provider's terms of service outright — not a technical limitation, a contractual
one.

**Resolution condition**
Either a hosting provider whose free tier permits commercial/payment-processing use is selected, or
a paid Vercel tier is budgeted before real checkout goes live.

**Blocked by**: none

---

#### F-D16-03 — Vapi has no ongoing free tier; the one-time signup credit is a hard, non-renewing ceiling on voice

- **Dimension**: D16
- **Severity**: S1 (blocks launch)
- **Kind**: MISSING
- **Verification**: VERIFIED
- **Free-tier feasible**: NO
- **Severity depends on assumption**: none

**Evidence**
1. `EXTERNAL_TERMS` — https://www.layer3labs.io/guides/vapi-pricing — new accounts receive a
   one-time $10 signup credit; no ongoing free tier; all-in usage typically $0.07-$0.25/minute
   depending on model/speech/telephony providers. Retrieved 2026-08-05.
2. `CODE` — `lib/vapi.ts:51-134` — `HAPA_ASSISTANT_CONFIG` uses `gpt-4o-mini` plus Vapi's own hosted
   voice, contributing to the metered cost.

**Impact**
At the cited rates, the one-time credit covers roughly 40-140 minutes of voice interaction total
across every user of this deployment, after which voice stops working account-wide with no renewal.
Per D06, a Vapi error does degrade gracefully to the typed-text fallback — this is not a broken
experience — but it is a real, approaching ceiling with no monitoring (per D10) to provide any
warning before it's reached.

**Resolution condition**
A funded, ongoing Vapi budget is established, or usage is capped/monitored so credit exhaustion is
anticipated rather than discovered when voice silently stops working.

**Blocked by**: none

---

**Note on volatility**: all quota and pricing figures above were retrieved 2026-08-05 during
planning and re-confirmed against provider documentation during this audit pass. Provider terms and
pricing change; re-verify before acting on any of these three findings.
