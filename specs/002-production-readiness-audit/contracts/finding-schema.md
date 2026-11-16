# Contract: Finding Schema and Severity Scheme

**Status**: FROZEN as of 2026-08-05 | **Authority**: Constitution Principle V

Every finding in the audit uses this shape. Dimensions are audited in parallel, so a dimension may
not invent severity levels, omit required fields, or rename them. Enforced by
[quickstart.md](../quickstart.md) §Validation.

---

## Severity scheme

Calibrated for the launch target — free tiers only, ~5 real users, real money assumed in scope.
Rationale in [research.md](../research.md) §R2.

| Level | Blocks launch | Definition |
|-------|:---:|------------|
| **S0 — Blocker** | Yes | Violates a constitution NON-NEGOTIABLE, a provider's terms of service, or the law. Exposes or loses personal data. Takes or reports money incorrectly. Ships a false user-facing claim. |
| **S1 — Critical** | Yes | A real user among the first five hits it in ordinary use within days. Includes free-tier quota exhaustion during normal browsing, and unrecoverable failure with no fallback. |
| **S2 — Major** | No | Degrades experience or operability; a workaround exists, or it is survivable while visibly imperfect. |
| **S3 — Minor** | No | Quality, maintainability, or polish. No user-visible risk. |

**Severity rules**

1. `S0` requires one of: a cited constitution NON-NEGOTIABLE, a cited provider term, or a
   demonstrated data/money exposure path. Severity is argued from evidence, never from impression.
2. A finding whose remediation requires paid infrastructure (`free_tier_feasible = NO`) is **at
   least S1**. Under this launch target an unaffordable fix is a blocker.
3. Scale-driven concerns are not findings at all. They belong in the report's `deferred_by_scale`
   list — recorded as consciously out of scope, never as passes (spec FR-007).
4. A severity that would change under a different launch target MUST set
   `severity_depends_on_assumption`, so the alternate reading can be re-scored without re-auditing
   (spec FR-033).

---

## Required finding format

Every finding is rendered exactly like this:

```markdown
#### F-D16-01 — Feed exhausts the SerpApi free-tier monthly quota in normal use

- **Dimension**: D16 — Service-Tier Viability
- **Severity**: S1 (blocks launch)
- **Kind**: INCORRECT
- **Verification**: VERIFIED
- **Free-tier feasible**: UNKNOWN
- **Severity depends on assumption**: none

**Evidence**
1. `CODE` — `lib/serpapi.ts:19` — `MAX_QUERY_ATTEMPTS = 3`; `fetchLiveResults` fans out to
   remaining variants in parallel at `lib/serpapi.ts:168-176`, so one feed page costs 1–3 searches.
2. `CODE` — `app/api/products/gallery/route.ts:9` — one additional billed search per product
   detail view.
3. `EXTERNAL_TERMS` — https://serpapi.com/pricing — free plan is 250 searches/month with a
   50/hour throughput cap. Retrieved 2026-08-05.

**Impact**
At the worst case of 3 searches per page, the entire monthly allowance covers roughly 83 feed
pages across all users combined — about 16 pages per user per month at five users, before anyone
opens a product. The hourly cap is tighter: one engaged shopper can exhaust it alone.

**Resolution condition**
Measured consumption for a representative five-user month fits within the plan's quota with
headroom, **or** the feed degrades to curated results on quota refusal in a way that has been
exercised and shown to be indistinguishable from normal operation to the shopper.

**Blocked by**: none
```

The example above is illustrative of *format*. It is a real Phase 0 observation, but it is not
pre-adjudicated — the audit must re-derive and verify it.

---

## Field reference

| Field | Required | Values / rule |
|-------|:---:|---------------|
| `id` | Yes | `F-<Dnn>-<nn>`. Stable forever; never renumber when earlier findings close. |
| `title` | Yes | One line stating the **defect**, not the topic. "Feed exhausts quota", not "Quota". |
| `dimension` | Yes | Exactly one registry ID. |
| `severity` | Yes | `S0`–`S3`. No other values. |
| `kind` | Yes | `MISSING` — capability absent; `INCORRECT` — present but wrong (spec FR-008). |
| `verification_state` | Yes | `VERIFIED` — observed directly; `UNVERIFIED` — inferred from code without exercising it; `NOT_EXERCISED` — a control exists but nothing proves it runs (spec FR-009). |
| `evidence` | Yes | 1..n references. **Never zero** — a finding without evidence is deleted, not softened. |
| `impact` | Yes | What a real user or operator experiences. Concrete; no abstract risk language. |
| `resolution_condition` | Yes | Observable state that closes it. Checkable, not arguable. |
| `blocked_by` | No | Finding IDs that must resolve first (spec FR-014). Must be acyclic. |
| `severity_depends_on_assumption` | Cond. | Required when severity is assumption-sensitive; else `none`. |
| `free_tier_feasible` | Yes | `YES` / `NO` / `UNKNOWN`. `NO` forces at least S1. |
| `principle_conflict` | No | Set when remediation would collide with a constitution principle — surfaces it for a human, does not resolve it (spec FR-034). |

---

## Evidence reference types

| Type | Locator format | Extra requirement |
|------|----------------|-------------------|
| `CODE` | `path:line` or `path:start-end` | — |
| `ABSENT_ARTIFACT` | The path where it was expected | Must name the expectation, so absence is as checkable as presence |
| `COMMAND_OUTPUT` | The exact command run | Record the relevant output, not a summary of it |
| `EXTERNAL_TERMS` | URL | **`retrieved_at` date is mandatory** — quota claims expire |
| `DOC_CONFLICT` | Both sources, each with a locator | State which one the running code actually matches |

---

## Prohibited content

Structural enforcement of Constitution Principle VII: **the schema has no field capable of holding
captured personal data.** No finding, evidence observation, or impact statement may contain image
data, image-derived personal content, real shopper data, or secret values. Evidence cites the
*location* and describes the *flow*; it never reproduces the payload. Where a secret's exposure is
the finding, cite the variable name and its reachability — never the value.

---

## Anti-patterns

These fail review and must be rewritten:

| Anti-pattern | Why it fails |
|--------------|--------------|
| "No issues found in this area." as a `PASS` basis | Passing on absent evidence — spec FR-007. State what was checked. |
| "Consider adding tests." | No resolution condition, no severity basis. Not actionable. |
| Scoring a missing capability as a bug | Conflates `MISSING` with `INCORRECT` — spec FR-008. |
| Marking an untested fallback `VERIFIED` | Constitution Principle II: an untested fallback does not count. |
| Recommending a safety control be relaxed to reach `PASS` | Spec FR-032 and SC-009. Prohibited outright. |
| A finding filed against two dimensions | File under the primary one; cross-reference the other. |
| An undated quota or pricing claim | `EXTERNAL_TERMS` without `retrieved_at` is invalid. |
