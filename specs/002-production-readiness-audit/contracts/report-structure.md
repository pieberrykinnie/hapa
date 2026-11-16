# Contract: Report Structure

**Status**: FROZEN as of 2026-08-05 | **Authority**: Constitution Principle V

Defines the shape of `audit-report.md`, the audit's single deliverable. Section order is normative:
spec SC-001 requires a reader to reach the launch decision within five minutes, which only holds if
the verdict precedes the detail (spec FR-001).

---

## Section order

```text
1. Verdict                  — overall verdict + the blocking findings, nothing else
2. Scope                    — launch target, assumptions, date, commit
3. Severity scheme          — the S0–S3 table and what blocks
4. Dimension summary        — one table row per dimension, all 16
5. Findings                 — grouped by dimension, ordered by severity within each
6. Deferred by scale        — consciously not assessed; explicitly not passes
7. Remediation sequence     — blocking findings in dependency order
8. Provenance               — how it was produced, what to re-verify, registry amendments
```

---

## 1. Verdict

The whole launch decision, readable standing up. Contains:

- `overall_verdict`: `READY` / `READY_WITH_CONDITIONS` / `NOT_READY`
- Every blocking (S0/S1) finding as a one-line entry with its ID
- Nothing else. No methodology, no caveats, no preamble.

**Derivation rule**: `NOT_READY` if any S0 or S1 finding exists. The verdict is computed from the
findings, never asserted alongside them. `READY` is forbidden while any dimension is
`UNABLE_TO_ASSESS`.

## 2. Scope

- The launch target judged against: **free tiers only, ~5 real users, real money assumed in scope**
  (spec FR-004)
- The real-money assumption, called out explicitly with the note that findings tagged
  `severity_depends_on_assumption` can be re-scored in one pass if it is wrong
- `assessed_at` date and the exact commit SHA and branch (spec FR-005)
- The assess-only boundary: no code was changed (spec FR-031)

## 3. Severity scheme

Reproduced verbatim from [finding-schema.md](./finding-schema.md). Readers must not have to open
another file to interpret a severity (spec FR-003).

## 4. Dimension summary

Exactly 16 rows — one per registry entry, no more, no fewer (spec SC-002).

| Dimension | Verdict | Blocking | Total | Basis |
|-----------|---------|:---:|:---:|-------|
| D01 — Identity and Session Integrity | FAIL | 2 | 3 | *what was examined* |

`Basis` is required on every row, including `PASS` rows, where it must name positive evidence
rather than the absence of a problem (spec FR-007, SC-012).

## 5. Findings

Grouped by dimension in registry order; within a dimension, ordered by severity. Each finding
rendered exactly per [finding-schema.md](./finding-schema.md).

A dimension with no findings still appears, with its `PASS` basis stated.

## 6. Deferred by scale

Concerns consciously excluded by the five-user assumption — scaling, pooling, load testing,
abuse-oriented rate limiting, CDN optimization. Each entry names the concern and the assumption
that defers it.

**This section may never be read as passing.** It exists so that a later launch at larger scale can
recover exactly what this audit chose not to look at (spec FR-007).

## 7. Remediation sequence

The blocking findings in dependency order, derived from `blocked_by` (spec FR-014). Not a schedule
and not an estimate — an ordering, so the first task is unambiguous. Findings with no dependencies
are listed as independently startable.

## 8. Provenance

- Commands run and their results
- Which quota and pricing claims carry which retrieval dates, and the instruction to re-verify at
  remediation time (research §R3)
- Any amendment made to the dimension registry during the run, per its amendment rule
- Confirmation that the working tree outside `specs/` is unchanged (spec SC-010)

---

## Global rules

1. **Verdict before detail.** No finding, methodology note, or caveat may precede §1.
2. **No unevidenced claim anywhere**, including in the summary table's `Basis` column.
3. **No personal data or secret values**, in any section (Constitution Principle VII).
4. **No remediation applied** — the report proposes, the repository is untouched (spec FR-031).
5. **Stable IDs across runs.** A re-run reuses finding IDs for surviving findings, marks closed ones
   as resolved, and assigns fresh IDs only to genuinely new findings (spec SC-011).
