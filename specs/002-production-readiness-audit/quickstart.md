# Quickstart: Running and Validating the Audit

**Date**: 2026-08-05 | **Plan**: [plan.md](./plan.md)

How to execute the audit and prove the result satisfies the spec. The audit is read-only: nothing
here modifies application code, configuration, or dependencies.

---

## Prerequisites

**Dependencies must be installed.** This worktree has no `node_modules`, which blocks two things
the audit needs: the verification commands, and the Next.js 16 documentation that the constitution
requires for any version-specific claim.

```bash
pnpm install --frozen-lockfile
```

`--frozen-lockfile` matters twice over — it avoids mutating `pnpm-lock.yaml` (the audit must not
change the repository), and its success or failure is itself evidence for D15 on whether an install
is reproducible.

**No API keys are required.** The audit is static. Do not supply `SERPAPI_KEY` — exercising the
discovery path would consume the very free-tier quota under examination (research §R3).

**Record the starting state**, since the report must name the exact commit it describes:

```bash
git rev-parse HEAD && git status --porcelain
```

The working tree should be clean apart from `specs/`.

---

## Producing the audit

Work dimension by dimension against the frozen registry. Dimensions are independent by design and
may be worked in any order or in parallel — that independence is why the contracts are frozen
first (Constitution Principle V).

1. **Read the contracts before writing any finding**:
   [dimension-registry.md](./contracts/dimension-registry.md),
   [finding-schema.md](./contracts/finding-schema.md),
   [report-structure.md](./contracts/report-structure.md).
2. **Run the verification commands** and capture their output as `COMMAND_OUTPUT` evidence. All are
   non-mutating:

   ```bash
   pnpm build
   ```

   ```bash
   pnpm test
   ```

   ```bash
   pnpm lint
   ```

3. **Assess each dimension**, producing findings per the schema. A dimension with nothing wrong
   still gets a verdict and a stated basis naming what was checked.
4. **Assemble `audit-report.md`** in this directory, in the section order fixed by
   [report-structure.md](./contracts/report-structure.md).

### Method constraints

| Constraint | Source |
|------------|--------|
| Cite `path:line` or a named absent artifact for every finding | spec FR-006 |
| Any claim that a Next.js 16 API is misused cites `node_modules/next/dist/docs/` | Constitution, Technology Constraints |
| Never copy image data, image-derived personal content, or secret values into any artifact | Constitution Principle VII |
| An unexercised control is `NOT_EXERCISED`, never `VERIFIED` | Constitution Principle II, spec FR-009 |
| Every quota or pricing claim carries a retrieval date | research §R3 |
| Modify no source file, config, dependency, or lockfile | spec FR-031 |

---

## Validating the result

Run these before declaring the audit complete. Each maps to a success criterion the spec already
committed to.

### Automated checks

**Non-mutation — the audit changed nothing outside its own directory** (SC-010):

```bash
git status --porcelain -- . ':!specs/'
```

Expected: empty output. Any line here is a spec violation, not a stylistic issue.

**The application is exactly as healthy as before the audit began** (SC-010):

```bash
pnpm build && pnpm test
```

Expected: identical results to the pre-audit run recorded in §Prerequisites.

**Every dimension is present — exactly 16, no more, no fewer** (SC-002):

```bash
grep -cE '^\| D[0-9]{2} ' specs/002-production-readiness-audit/audit-report.md
```

Expected: `16`.

**Every finding carries evidence** (SC-003) — compare the count of findings against the count of
evidence blocks:

```bash
grep -cE '^#### F-D[0-9]{2}-[0-9]{2}' specs/002-production-readiness-audit/audit-report.md
```

```bash
grep -cE '^\*\*Evidence\*\*' specs/002-production-readiness-audit/audit-report.md
```

Expected: the two numbers are equal. A finding without an evidence block is deleted, not softened.

**No undated external claim**: every `EXTERNAL_TERMS` reference must be accompanied by a
`Retrieved` date.

```bash
grep -c 'EXTERNAL_TERMS' specs/002-production-readiness-audit/audit-report.md
```

```bash
grep -ci 'retrieved' specs/002-production-readiness-audit/audit-report.md
```

Expected: retrievals ≥ external-terms references.

### Judgment checks

These cannot be scripted. Verify by reading.

| Check | Criterion |
|-------|-----------|
| A reader unfamiliar with the repo states the decision and top three blockers within 5 minutes, from §1 alone | SC-001 |
| A randomly chosen finding's evidence is locatable in under 2 minutes, 9 times out of 10 | SC-004 |
| Every finding states a checkable resolution condition | SC-005 |
| Each constitution NON-NEGOTIABLE (II, VI, VII) has its own individually reasoned finding | SC-006 |
| Every path that can produce a charge is accounted for — confirmed human-authorized, or filed as blocking | SC-007 |
| A contributor can open a scoped task from any finding without a follow-up question, 9 times out of 10 | SC-008 |
| No finding recommends weakening a safety control | SC-009 |
| No dimension is `PASS` where the underlying capability does not exist | SC-012 |
| `Deferred by scale` is present and no entry reads as a pass | FR-007 |

### Re-run comparability

For a later audit (User Story 4): the dimension set is identical, surviving findings keep their
IDs, closed findings are marked resolved rather than deleted, and only genuinely new findings get
new IDs (SC-011).

---

## Expected outcome of the first run

Phase 0 research already established that at least two launch blockers exist — a free-tier quota
ceiling and a provider commercial-use restriction — before any code was reviewed. Combined with the
capability gaps the prototype openly declares (no authentication, no server-side persistence, no
payment provider), **an `overall_verdict` of `NOT_READY` is the expected result.**

That is the honest expectation, not a target. The audit's value is not the verdict — it is the
specific, evidenced, ordered list of what would have to change, and the knowledge of which of those
things can be fixed for free.
