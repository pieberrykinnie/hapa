# Phase 1 Data Model: Production Readiness Audit

**Date**: 2026-08-05 | **Plan**: [plan.md](./plan.md)

The audit's "data" is a document. These entities define its structure precisely enough that
findings written independently, by different people or in different sessions, compose into one
coherent report and remain comparable across runs (spec FR-015, User Story 4).

Field-level requirements are normative and derive from the spec requirement cited on each row.

---

## AuditReport

The single deliverable. Exactly one per run.

| Field | Required | Rule | Source |
|-------|----------|------|--------|
| `overall_verdict` | Yes | One of `READY`, `NOT_READY`, `READY_WITH_CONDITIONS`. Appears before any finding. | FR-001 |
| `launch_target` | Yes | The launch target judged against, stated in the document — free tiers only, ~5 users, real-money assumption. | FR-004 |
| `assessed_at` | Yes | ISO date of the run. | FR-005 |
| `repository_state` | Yes | Commit SHA and branch the audit describes. | FR-005 |
| `severity_scheme` | Yes | The S0–S3 definitions and which levels block launch. | FR-003 |
| `dimensions` | Yes | Exactly the 16 entries in the frozen registry. Neither more nor fewer. | FR-002, SC-002 |
| `findings` | Yes | Zero or more Findings. May be empty only if every dimension verdict is `PASS`. | FR-006 |
| `blocking_summary` | Yes | The blocking findings restated up front, so the launch decision is readable in isolation. | SC-001 |
| `deferred_by_scale` | Yes | Concerns consciously not assessed because of the five-user assumption. Never rendered as passes. | FR-007 |
| `quota_and_terms_note` | Yes | Retrieval date for every provider quota or pricing claim, plus the instruction to re-verify at remediation time. | R3 |

**Validation**

- `overall_verdict` MUST be `NOT_READY` if any finding is S0 or S1. The overall verdict is derived,
  never asserted independently of the findings.
- `READY_WITH_CONDITIONS` is permitted only when every remaining finding is S2 or S3 **and** each
  stated condition is itself an S2/S3 finding.
- If any dimension verdict is `UNABLE_TO_ASSESS`, the report MUST NOT claim `READY`.

---

## ReadinessDimension

One area under assessment. The set is frozen in
[`contracts/dimension-registry.md`](./contracts/dimension-registry.md).

| Field | Required | Rule | Source |
|-------|----------|------|--------|
| `id` | Yes | `D01`–`D16`. Stable across runs. | FR-015 |
| `name` | Yes | From the registry; not restated in the auditor's own words. | FR-002 |
| `verdict` | Yes | `PASS`, `CONCERNS`, `FAIL`, or `UNABLE_TO_ASSESS`. | FR-002, FR-007 |
| `verdict_basis` | Yes | What was examined to reach the verdict. For `PASS`, must name positive evidence, not the absence of a problem. | FR-007 |
| `unable_reason` | Conditional | Required when verdict is `UNABLE_TO_ASSESS`; forbidden otherwise. | FR-007 |
| `findings` | Yes | Findings belonging to this dimension; may be empty. | — |

**Validation**

- `PASS` with zero findings requires `verdict_basis` to cite what was checked. "Nothing was found"
  is not a basis — this is the structural guard behind FR-007 and SC-012.
- A dimension covering a capability that does not exist MUST NOT be `PASS`. It is `FAIL` (gap
  against the launch target) or `UNABLE_TO_ASSESS`, per the spec's first edge case.
- `CONCERNS` means the dimension holds only non-blocking findings. Any S0/S1 finding forces `FAIL`.

**State transitions across runs** (User Story 4): `UNABLE_TO_ASSESS` → `FAIL` → `CONCERNS` → `PASS`
is the expected remediation direction. A dimension disappearing between runs is invalid; the
registry is fixed, so its absence signals a broken run rather than resolved work.

---

## Finding

One observed gap or risk. The unit contributors act on.

| Field | Required | Rule | Source |
|-------|----------|------|--------|
| `id` | Yes | `F-<dimension>-<nn>`, e.g. `F-D16-01`. Stable across runs; never renumbered when earlier findings close. | FR-015, SC-011 |
| `dimension` | Yes | Exactly one registry `id`. A concern spanning dimensions is filed under its primary one and cross-referenced. | — |
| `title` | Yes | One line, stating the defect rather than the topic. | FR-011 |
| `severity` | Yes | `S0`–`S3` from the frozen scheme. Auditors may not invent levels. | FR-012 |
| `kind` | Yes | `MISSING` (capability absent) or `INCORRECT` (present but wrong). | FR-008 |
| `verification_state` | Yes | `VERIFIED`, `UNVERIFIED`, or `NOT_EXERCISED` — a control that exists but has never been run is not "working". | FR-009 |
| `evidence` | Yes | One or more EvidenceReferences. Never zero. | FR-006, SC-003 |
| `impact` | Yes | What a real user or operator experiences. Concrete, not abstract risk language. | FR-011 |
| `resolution_condition` | Yes | The observable state that closes it. Written so it can be checked, not argued. | FR-011, SC-005 |
| `blocked_by` | No | IDs of findings that must be resolved first. | FR-014 |
| `severity_depends_on_assumption` | Conditional | Required when severity would change under a different launch target — notably the real-money assumption. Names the assumption. | FR-033 |
| `free_tier_feasible` | Yes | `YES`, `NO`, or `UNKNOWN` — whether the resolution is achievable without paid infrastructure. `NO` forces at least S1. | R1, R4 |
| `principle_conflict` | No | Set when remediation would collide with a constitution principle. Surfaces the conflict; does not resolve it. | FR-034 |

**Validation**

- `evidence` non-empty is the hardest rule in the model. A finding without evidence is deleted, not
  softened (SC-003 requires 100%).
- `severity = S0` requires either a cited constitution NON-NEGOTIABLE, a cited provider term, or a
  demonstrated data/money exposure path.
- `free_tier_feasible = NO` MUST NOT be scored below S1 — under this launch target an unaffordable
  fix is a blocker, not a nice-to-have.
- `kind = MISSING` findings MUST NOT be phrased as bugs; they are gaps against the launch target.
- No field may contain image data, image-derived personal content, or real user data (Principle
  VII). The schema provides nowhere to put it.

---

## EvidenceReference

The concrete basis for a finding. Findings are only as good as these.

| Field | Required | Rule |
|-------|----------|------|
| `type` | Yes | `CODE`, `ABSENT_ARTIFACT`, `COMMAND_OUTPUT`, `EXTERNAL_TERMS`, or `DOC_CONFLICT`. |
| `locator` | Yes | `path:line` for `CODE`; the expected path for `ABSENT_ARTIFACT`; the exact command for `COMMAND_OUTPUT`; a URL for `EXTERNAL_TERMS`; both sources for `DOC_CONFLICT`. |
| `observation` | Yes | What is actually there — or demonstrably not there. |
| `retrieved_at` | Conditional | Required for `EXTERNAL_TERMS`, whose accuracy expires (R3). |

**Validation**

- `ABSENT_ARTIFACT` must name where the artifact was expected, so a reader can confirm the absence
  as quickly as a presence (SC-004).
- `EXTERNAL_TERMS` without `retrieved_at` is invalid — an undated quota claim cannot be trusted or
  refreshed.
- Every reference must be independently checkable in under two minutes (SC-004).

---

## Severity and Verdict

Closed vocabularies, defined once in
[`contracts/finding-schema.md`](./contracts/finding-schema.md) and referenced everywhere else.

- **Severity**: `S0` Blocker, `S1` Critical, `S2` Major, `S3` Minor. `S0`/`S1` block launch.
- **Dimension verdict**: `PASS`, `CONCERNS`, `FAIL`, `UNABLE_TO_ASSESS`.
- **Overall verdict**: `READY`, `READY_WITH_CONDITIONS`, `NOT_READY`.

Calibration for the five-user, free-tier target lives in [research.md](./research.md) §R2.

---

## Relationships

```text
AuditReport
 ├── launch_target, severity_scheme, repository_state   (scope: what was judged, against what)
 ├── deferred_by_scale[]                                (explicitly not assessed — never passes)
 └── dimensions[16]  (frozen registry, D01–D16)
      └── findings[]
           ├── evidence[1..n]        (never empty)
           ├── blocked_by[] ─────────► Finding.id   (ordering constraints, FR-014)
           └── principle_conflict ───► Constitution principle (surfaced, not resolved)
```

**Cardinality rules**

- Exactly 16 dimensions, always. Comparability across runs depends on it (SC-011).
- A finding belongs to exactly one dimension.
- A finding has at least one evidence reference.
- `blocked_by` must be acyclic; a cycle is a modeling error to resolve before publishing.
