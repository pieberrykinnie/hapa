# Phase 0 Research: Production Readiness Audit

**Date**: 2026-08-05 | **Plan**: [plan.md](./plan.md)

Purpose: resolve every unknown that would otherwise force the audit to guess, before any dimension
is assessed. The dominant unknown was introduced by the user's constraint — *free tiers only, ~5
real users* — which changes both what "ready" means and how severely each gap scores.

---

## R1 — What "production ready" means for this launch

**Decision**: The launch target is **real people using HAPA for real shopping, on free service
tiers exclusively, at a scale of roughly five concurrent-ish users**. The safety and privacy bar
remains the full HAPA Constitution v2.1.0 bar. The *scale* bar drops to near zero. The *cost* bar
becomes a hard constraint rather than a preference.

Stated as a formula the audit applies to every finding:

> A finding blocks launch if a real shopper could be harmed, misled, or charged incorrectly — or
> if the only remediation requires paid infrastructure. A finding does not block launch merely
> because the system would fail at 500 users.

**Rationale**: "Production" for this project is already defined by its own governing documents —
the constitution requires account-backed storage, private photo handling, human-authorized
purchases, and real payment execution. The user's constraint narrows *how* those may be satisfied
(free tiers) and *how much load* they must survive (five users). It does not repeal them; the
constitution's Local Prototype Exception is explicitly "a delivery-stage constraint, not approval
to ship personal or financial data handling without the account-backed controls."

**On whether real money moves**: the user did not say. The audit assumes **it does**, for two
reasons. First, it is the safe direction — assuming money moves produces a superset of findings,
and spec FR-033 requires every severity that depends on this assumption to declare it, so the
narrower "no real money, closed testing" reading can be re-scored by striking flagged findings
rather than re-running the audit. Second, it is what the constitution means by production. This
assumption is called out in the report's own scope section so a reader can overturn it in one pass.

**Alternatives considered**:

- *Judge against the full constitution with no scale allowance.* Rejected: it would generate
  blocking findings about connection pooling, horizontal scaling, and abuse rate-limiting that are
  irrelevant at five users, burying the findings that matter.
- *Treat "free tier" as merely a preference and recommend the best fix regardless of price.*
  Rejected: it inverts the user's constraint. A recommendation the user cannot adopt is not a
  remediation. Under this launch target, cost is a correctness property.
- *Assume no real money, closed friendly testing.* Rejected as the default because it is the
  narrower reading; adopting it would silently drop commerce findings that are expensive to
  rediscover. Retained as a cheap re-score path via FR-033.

---

## R2 — Severity calibration for this launch target

**Decision**: Four levels. **S0 and S1 block launch; S2 and S3 do not.**

| Level | Meaning at this launch target |
|-------|-------------------------------|
| **S0 — Blocker** | Violates a constitution NON-NEGOTIABLE, a provider's terms of service, or the law. Exposes or loses personal data. Takes or reports money incorrectly. Ships a user-facing claim that is false. |
| **S1 — Critical** | A real user among the first five hits it in ordinary use within days. Includes free-tier quota exhaustion during normal browsing, and any unrecoverable failure with no fallback. |
| **S2 — Major** | Degrades experience or operability; a workaround exists, or it is survivable while visibly imperfect. |
| **S3 — Minor** | Quality, maintainability, or polish. No user-visible risk. |

**Rationale**: Five users makes ordinary severity scales lie in both directions. Load-related
defects that would be S0 at scale are S3 here. Meanwhile quota and licensing defects, which barely
register at a funded launch, become S0/S1 here because the free tier *is* the infrastructure. The
scheme is calibrated so that the blocking set stays small enough to act on.

**Explicitly de-scoped by the five-user assumption** — recorded as "deferred by scale", never as
"pass", per spec FR-007:

- horizontal scaling, autoscaling, multi-region, and failover
- database connection pooling and query optimization under concurrency
- load and stress testing, capacity planning
- abuse-oriented rate limiting and bot defense (distinct from quota protection, which is **in**
  scope under D16 and D06)
- CDN cache-hit optimization

**Alternatives considered**: A numeric 1–10 risk score. Rejected — false precision, and it obscures
the only distinction that matters to the decision-maker, which is *blocks launch or does not*.

---

## R3 — Free-tier viability of the dependencies HAPA already has

This is the research that changed the plan. Two of three current external dependencies have
free-tier limits that the application's own design collides with.

### SerpApi — product discovery

**Facts**: the free plan provides **250 searches per month** with a **50-per-hour throughput cap**
([SerpApi pricing](https://serpapi.com/pricing), confirmed against
[independent summaries](https://costbench.com/software/web-scraping/serpapi/free-plan/)).

**Consumption in this codebase**: `lib/serpapi.ts` sets `MAX_QUERY_ATTEMPTS = 3`, and
`fetchLiveResults` issues a primary search then fans out to the remaining query variants in
parallel (`lib/serpapi.ts:168-176`). One feed page therefore costs **1 to 3 searches**, and returns
`PAGE_SIZE = 12` products. Separately, `app/api/products/gallery/route.ts` spends **one further
search every time a shopper opens a product detail page** — the route's own comment notes each call
is distinct and billed.

**Implication**: at the worst case of 3 searches per page, the entire monthly free allowance is
**about 83 feed pages for all users combined** — roughly 16 pages per user per month at five users,
before a single product is opened. The 50-per-hour cap is tighter still: one engaged shopper
scrolling an "infinite" feed can exhaust the hourly ceiling alone. This is not a scale problem that
five users makes disappear; the ceiling is monthly and global, so **five users hit it as fast as
five hundred would**.

**Audit consequence**: D16 must quantify actual consumption per user journey, and D06 must
determine what the application does when the quota is refused — whether the fallback catalogue
engages cleanly, or whether the shopper sees an empty or broken feed. The existing fallback
blending is promising evidence but requires verification, not assumption (spec FR-009).

### Vercel — hosting

**Facts**: the Hobby plan is restricted to **non-commercial, personal use**, and Vercel's fair-use
guidance names **processing payment** as a commercial activity, alongside advertising, affiliate
linking as a primary purpose, and soliciting donations. Commercial projects require Pro at
$20/month/member ([summary of Vercel's 2026 fair-use terms](https://www.promptstoproduct.com/vercel-free-tier-limits),
corroborated by [independent pricing analysis](https://kuberns.com/blogs/vercel-pricing/)).

**Implication**: the constitution names Vercel as the deployment target, and the launch target
includes real checkout. **A shopping application that processes real payments cannot lawfully run
on Vercel's free tier.** This is a terms-of-service blocker, not a technical one — no amount of
code quality resolves it. It sits precisely at the intersection the user's constraint created:
free-tier-only and real commerce are, on this specific provider, mutually exclusive.

**Audit consequence**: D16 records this as S0 under the money-moves assumption, tagged per FR-033
so that it downgrades cleanly if the launch turns out to handle no real money. Resolution options —
a host whose free tier permits commercial use, or accepting a paid tier, or deferring real payments
— are remediation decisions the audit scopes but does not make.

### Vapi — browser voice

**Facts**: no durable free tier. New accounts receive **$10 in credits**; ongoing use is
usage-priced from roughly **$0.05/minute** for orchestration alone, with real all-in costs commonly
$0.07–$0.25/minute depending on the model, speech, and telephony providers chosen
([Vapi pricing analysis, 2026](https://www.layer3labs.io/guides/vapi-pricing);
[secondary review](https://www.cekura.ai/blogs/vapi-ai-pricing)).

**Implication**: voice is a **metered credit balance, not a free tier**. It runs until the credits
are gone and then stops. Under a strict free-tier-only constraint, voice is time-limited by
construction, and the failure mode arrives without warning mid-session.

**Audit consequence**: D16 assesses the runway; D06 assesses whether credit exhaustion degrades
gracefully — a voice feature that dies silently mid-demo violates Principle III as surely as a
crash does.

**Rationale for researching all three before writing the audit**: each is a *launch blocker
discoverable only by reading the provider's terms*, which no amount of code review would surface.
Establishing them in Phase 0 prevents the audit from producing a confident "the code looks fine"
verdict on paths that cannot legally or economically run.

**Note on volatility**: provider terms and quotas change. Every quota and pricing claim in the
final report must carry its retrieval date, and the report must state that terms require
re-verification at remediation time.

---

## R4 — Free-tier availability of capabilities the prototype lacks

The launch target requires capabilities this repository does not have at all: authenticated
identity, server-side authoritative persistence, private object storage for photographs, a payment
provider, error monitoring, and automated quality gates.

**Decision**: The audit records each missing capability as a **gap with a stated free-tier
feasibility judgment**, but does **not** select vendors.

**Rationale**: Vendor selection is remediation work, explicitly out of scope under spec FR-031. But
feasibility is squarely in scope, because under this launch target a gap whose only fix costs money
is an S0 rather than an S2 — the audit cannot assign severity without judging it. The categorical
finding is that hosted free tiers sized well beyond five users exist in every one of these
categories (managed authentication, managed Postgres, object storage, error monitoring, and CI
minutes on public repositories), and payment providers conventionally charge per transaction rather
than by subscription — so the capability gaps are, in principle, closable within the constraint.
The provider-terms trap found in R3 is the exception that proves the rule: **feasibility must be
confirmed against each provider's commercial-use terms at selection time, not assumed from the
existence of a free tier.**

**Alternatives considered**: Naming a specific recommended stack in the audit. Rejected on two
grounds — it exceeds the assess-don't-repair boundary, and free-tier terms move fast enough that a
named recommendation would carry a shelf life the report cannot honor.

---

## R5 — Audit method

**Decision**: Single-pass, read-only, dimension-parallel assessment against a frozen contract.

- **Evidence**: every finding cites `path:line` or a named absent artifact. Verification commands
  (`pnpm build`, `pnpm test`, `pnpm lint`) are run and their output recorded, since they are
  non-mutating and produce the strongest available evidence for D08 and D09.
- **Version-specific claims**: any assertion that a Next.js 16 API is misused must cite
  `node_modules/next/dist/docs/`, per the constitution's Technology Constraints. Recollection is
  not evidence.
- **Personal data**: no image data, image-derived personal content, or real user data is copied
  into any artifact (Principle VII). The finding schema deliberately has no field for captured
  data.
- **Non-mutation**: no source file, configuration, dependency, or lockfile is modified. Spec SC-010
  is verified by confirming a clean working tree outside `specs/` when the audit completes.

**Rationale**: Read-only assessment is the spec's defining boundary (FR-031). Freezing the contract
first is required by Constitution Principle V, since dimensions are intended to be worked in
parallel and would otherwise drift into incompatible severity vocabularies.

**Alternatives considered**: Running the application and probing it dynamically. Rejected for the
first pass — it requires live API keys, would consume the very SerpApi quota under examination, and
risks mutating `localStorage` state. Recorded instead as a recommended follow-up where a finding
genuinely cannot be resolved statically.

---

## R6 — Spec amendment for D16 (adopted)

**Decision**: Add D16 — Service-Tier Viability — to the dimension registry, and amend `spec.md`
**before** registering the dimension, as Principle V requires. Adopted rather than left pending: a
registry entry citing a requirement that does not exist would be exactly the silent contract drift
the principle forbids.

**Requirement wording**, now present in `spec.md` under *Required coverage* as **FR-035**:

> **FR-035**: The audit MUST assess whether each external service tier the project depends on
> permits the intended production use under its terms, and whether its quota ceiling accommodates
> the expected user volume for a full billing period. Findings MUST quantify expected consumption
> per user journey rather than asserting sufficiency.

**Rationale**: Constitution Principle V requires the contract to change before dependent work. The
spec's required-coverage list was written before the free-tier constraint existed, and neither
FR-021 (dependency *failure* paths) nor FR-030 (supply chain and reproducibility) covers *terms and
quota viability*. Phase 0 found two launch blockers inside this gap, which is sufficient evidence
that it is a real dimension and not an invented one.

**Alternatives considered**: Stretching FR-021 to cover quota exhaustion as "a dependency failure
path". Rejected — it would cover the SerpApi ceiling but not the Vercel licensing blocker, which is
not a failure path at all. The gap is real and deserves its own requirement.

---

## Resolved unknowns summary

| Unknown | Resolution |
|---------|-----------|
| Definition of "production" under the new constraint | R1 — full safety bar, near-zero scale bar, hard cost constraint |
| Whether real money is in scope | R1 — assumed yes (safe direction), flagged per FR-033 for cheap re-score |
| How to score severity at five users | R2 — S0–S3, S0/S1 block; scale concerns deferred, not passed |
| Whether current dependencies survive free tiers | R3 — SerpApi quota and Vercel commercial-use terms are blockers; Vapi is credit-limited |
| Whether missing capabilities are closable for free | R4 — in principle yes; terms must be confirmed per provider at selection |
| How evidence is gathered without mutation | R5 — static review plus non-mutating commands; no personal data captured |
| Whether the new dimension needs a spec change | R6 — yes; FR-035 added to `spec.md` before D16 was registered |
