---

description: "Task list for the HAPA production readiness audit"
---

# Tasks: Production Readiness Audit

**Input**: Design documents from `/specs/002-production-readiness-audit/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: This feature produces **no application code** (spec FR-031), so there is no code under
test and no code-test tasks. The constitution's testing obligations map onto the audit as
*verification* obligations, and they are present rather than skipped:

- Principle II ("an untested fallback does not count") → **T014** assesses every fallback and
  **T040** enforces that unexercised ones are recorded `NOT_EXERCISED`, never `VERIFIED`.
- The audit's own correctness is verified by Phase 7, which executes the checks in
  [quickstart.md](./quickstart.md) against the finished report.

**Organization**: Grouped by user story. Each of the 16 readiness dimensions writes to its **own
fragment file** under `findings/`, so the 16 assessment tasks are genuinely parallel — no two tasks
ever write the same file. A later task merges fragments into the report.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Include exact file paths in descriptions

## Path Conventions

All audit output lives under `specs/002-production-readiness-audit/`. The repository outside that
directory is **read-only for the entire duration** — modifying it is a spec violation, not a style
choice.

- Dimension fragments: `specs/002-production-readiness-audit/findings/D<nn>-<slug>.md`
- Working evidence: `specs/002-production-readiness-audit/findings/_*.md`
- Deliverable: `specs/002-production-readiness-audit/audit-report.md`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Make the repository assessable without changing it

- [ ] T001 Install dependencies with `pnpm install --frozen-lockfile` from the repository root — required for the Phase 2 verification commands and for `node_modules/next/dist/docs/`, which the constitution requires for any Next.js 16 claim. Record whether the frozen install succeeded; that result is evidence for D15.
- [ ] T002 [P] Record the baseline repository state — `git rev-parse HEAD`, branch name, and `git status --porcelain` output — in `specs/002-production-readiness-audit/findings/_provenance.md`. The report must name the exact commit it describes (spec FR-005).
- [ ] T003 [P] Create `specs/002-production-readiness-audit/findings/` with one stub file per dimension named `D01-identity-session.md` through `D16-service-tier-viability.md`, each carrying the dimension's ID, name, and scope boundary copied from `specs/002-production-readiness-audit/contracts/dimension-registry.md`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Capture the evidence and scaffolding every dimension depends on

**⚠️ CRITICAL**: No dimension assessment may begin until this phase is complete — findings must cite
recorded command output rather than re-running commands ad hoc.

- [ ] T004 [P] Run `pnpm build` from the repository root and record the full result in `specs/002-production-readiness-audit/findings/_cmd-build.md` as `COMMAND_OUTPUT` evidence. This is the constitution's stated merge bar; its result is primary evidence for D08.
- [ ] T005 [P] Run `pnpm test` and record the full result, including which files ran, in `specs/002-production-readiness-audit/findings/_cmd-test.md`. Primary evidence for D09.
- [ ] T006 [P] Run `pnpm lint` and record the full result in `specs/002-production-readiness-audit/findings/_cmd-lint.md`. Evidence for D08.
- [ ] T007 Create `specs/002-production-readiness-audit/audit-report.md` with the eight-section skeleton fixed by `specs/002-production-readiness-audit/contracts/report-structure.md`, including an empty 16-row dimension table. Sections stay empty until their owning task fills them.
- [ ] T008 Confirm `node_modules/next/dist/docs/` exists and index the guides relevant to routing, request handlers, metadata, and auth boundaries into `specs/002-production-readiness-audit/findings/_nextjs-docs-index.md`, so version-specific claims cite documentation rather than recollection.

**Checkpoint**: Evidence base captured — all 16 dimension assessments can now run in parallel.

---

## Phase 3: User Story 1 - Decide Whether HAPA Can Ship (Priority: P1) 🎯 MVP

**Goal**: Produce the launch decision — every dimension assessed, findings evidenced, and an overall
verdict a decision-maker can act on without reading the codebase.

**Independent Test**: Hand the report to someone who has never seen the repository and ask "can this
ship, and why not?" They answer correctly from §1 alone, without opening a source file.

**Why all 16 dimensions live here**: spec SC-002 requires every dimension to carry a verdict before
an overall verdict is legitimate. US1 is therefore the largest phase by design — and the reason the
fragment-per-dimension layout exists.

### Dimension assessments (all parallel — 16 distinct files)

- [ ] T009 [P] [US1] Assess **D01 Identity and Session Integrity** into `specs/002-production-readiness-audit/findings/D01-identity-session.md` — examine `components/onboarding-identity.tsx` and `components/hapa-provider.tsx` for cross-session/device identity, what "sign out" actually removes, and whether personal data attaches to an account or a browser. Expect `kind = MISSING` findings scored against the launch target, not bug reports.
- [ ] T010 [P] [US1] Assess **D02 Authoritative State and Data Ownership** into `specs/002-production-readiness-audit/findings/D02-authoritative-state.md` — trace `lib/onboarding/local-store.ts` and `components/hapa-provider.tsx` to determine the source of truth for identity, preferences, payment status, and orders, and what a shopper loses by clearing browser storage.
- [ ] T011 [P] [US1] Assess **D03 Private Media Lifecycle** into `specs/002-production-readiness-audit/findings/D03-private-media.md` — trace consent, derivation, every hop, retention, and deletion across `components/onboarding/ProfileSetup.tsx`, `components/photo-vibe-overlay.tsx`, and `lib/onboarding/`. Reproduce **no** image data or image-derived personal content (Principle VII).
- [ ] T012 [P] [US1] Assess **D04 Purchase Authorization** into `specs/002-production-readiness-audit/findings/D04-purchase-authorization.md` — enumerate every path in `components/purchase-flow.tsx`, `lib/purchase-agent.ts`, and `components/billing/` that can result in a charge, and determine whether explicit human confirmation of the exact total precedes each one (Principle VI).
- [ ] T013 [P] [US1] Assess **D05 Truthful Outcome Reporting** into `specs/002-production-readiness-audit/findings/D05-truthful-outcomes.md` — determine whether any authentication, payment, or order outcome can render as more successful or certain than it is, including whether a timeout can become a false success (Principle III).
- [ ] T014 [P] [US1] Assess **D06 Dependency Failure and Fallbacks** into `specs/002-production-readiness-audit/findings/D06-dependency-fallbacks.md` — for `lib/serpapi.ts`, `lib/vapi.ts`, `lib/fallback-feed.ts`, and `app/api/feed/route.ts`, determine behavior on timeout, malformed response, missing key, and **quota refusal**, and mark every fallback `VERIFIED` / `UNVERIFIED` / `NOT_EXERCISED` (Principle II).
- [ ] T015 [P] [US1] Assess **D07 Secrets and Configuration** into `specs/002-production-readiness-audit/findings/D07-secrets-configuration.md` — check the server/client boundary for all four referenced variables (`SERPAPI_KEY`, `NEXT_PUBLIC_VAPI_PUBLIC_KEY`, `FORCE_FALLBACK`, `NODE_ENV`), whether any secret is browser-reachable, and the gap against `.env.local.example`, which documents one of the four.
- [ ] T016 [P] [US1] Assess **D08 Automated Quality Gates** into `specs/002-production-readiness-audit/findings/D08-quality-gates.md` — cite `_cmd-build.md`, `_cmd-test.md`, and `_cmd-lint.md`, and record the absence of `.github/workflows/` as an `ABSENT_ARTIFACT` against the constitution's "`pnpm build` clean is the merge bar" requirement.
- [ ] T017 [P] [US1] Assess **D09 Test Adequacy on Critical Paths** into `specs/002-production-readiness-audit/findings/D09-test-adequacy.md` — map the 4 files in `tests/` against paths carrying money, personal data, and irreversible actions, and against each declared fallback. Judge by critical-path coverage, not aggregate percentage.
- [ ] T018 [P] [US1] Assess **D10 Operability and Incident Response** into `specs/002-production-readiness-audit/findings/D10-operability.md` — determine whether a production failure would be noticed at all, what an operator can see, and whether a rollback path exists.
- [ ] T019 [P] [US1] Assess **D11 Accessibility and Device Variation** into `specs/002-production-readiness-audit/findings/D11-accessibility.md` — check the shopper journey by keyboard and screen reader across `components/voice-overlay.tsx`, `components/onboarding/ThisYouDeck.tsx`, and `components/add-vibe-radial.tsx`, including behavior when microphone permission is denied or unavailable.
- [ ] T020 [P] [US1] Assess **D12 Latency Budget Enforcement** into `specs/002-production-readiness-audit/findings/D12-latency-budgets.md` — verify real timeouts exist (`lib/serpapi.ts` `TIMEOUT_MS`, `lib/vapi.ts`, `app/api/feed/route.ts`) and that no expired budget converts into a false success (Principle IV).
- [ ] T021 [P] [US1] Assess **D13 Disclosure Accuracy** into `specs/002-production-readiness-audit/findings/D13-disclosure-accuracy.md` — compare every user-facing claim about accounts, security, data location, and payment availability in `components/onboarding*.tsx` and `components/billing/` against what the code does, including the constitution's Prototype Mode labeling obligations.
- [ ] T022 [P] [US1] Assess **D14 Documentation and Operator Onboarding** into `specs/002-production-readiness-audit/findings/D14-documentation.md` — determine whether a new operator can configure, run, and deploy from `README.md`, which is the unmodified `create-next-app` template and documents a port the project does not use.
- [ ] T023 [P] [US1] Assess **D15 Supply Chain and Reproducibility** into `specs/002-production-readiness-audit/findings/D15-supply-chain.md` — check pinning and lockfile integrity across `package.json`, `pnpm-lock.yaml`, and `pnpm-workspace.yaml`, whether the declared `packageManager` and Node engine are enforced, and cite the T001 frozen-install result.
- [ ] T024 [P] [US1] Assess **D16 Service-Tier Viability** into `specs/002-production-readiness-audit/findings/D16-service-tier-viability.md` — re-derive and verify the Phase 0 observations in `research.md` §R3 rather than copying them: quantify SerpApi consumption per user journey against the 250/month and 50/hour ceilings, confirm Vercel Hobby's commercial-use restriction against real checkout, and assess Vapi's credit model. Every quota or pricing claim carries a `retrieved_at` date.

### Report assembly

- [ ] T025 [US1] Merge all 16 fragments into §5 of `specs/002-production-readiness-audit/audit-report.md` in **registry order** (D01–D05, D13, D06, D07, D10, D12, D16, D08, D09, D11, D14, D15 — safety first), each finding rendered exactly per `contracts/finding-schema.md`. Depends on T009–T024.
- [ ] T026 [US1] Fill §4 dimension summary in `specs/002-production-readiness-audit/audit-report.md` — exactly 16 rows, each with verdict, blocking count, total count, and a `Basis` naming what was examined. A `PASS` row citing only the absence of problems fails spec FR-007 and must be rewritten. Depends on T025.
- [ ] T027 [US1] Write §2 Scope in `specs/002-production-readiness-audit/audit-report.md` — the launch target (free tiers only, ~5 users), the real-money assumption stated explicitly as overturnable, the commit SHA from `_provenance.md`, and the assess-only boundary.
- [ ] T028 [US1] Write §3 Severity Scheme in `specs/002-production-readiness-audit/audit-report.md` reproduced verbatim from `contracts/finding-schema.md`, so no reader must open another file to interpret a severity.
- [ ] T029 [US1] Write §6 Deferred by Scale in `specs/002-production-readiness-audit/audit-report.md` from `research.md` §R2 — scaling, pooling, load testing, abuse rate limiting, CDN optimization — each naming the assumption that defers it. No entry may read as a pass.
- [ ] T030 [US1] Write §1 Verdict in `specs/002-production-readiness-audit/audit-report.md` — the overall verdict **derived** from the findings (`NOT_READY` if any S0/S1 exists; never `READY` while any dimension is `UNABLE_TO_ASSESS`) plus every blocking finding as a one-line entry. Nothing else in this section. Depends on T025, T026.

**Checkpoint**: The launch decision is answerable from the report alone. This is a complete,
deliverable MVP — everything after this makes it more actionable, not more correct.

---

## Phase 4: User Story 2 - Know Exactly What to Fix First (Priority: P1)

**Goal**: Turn findings into work a contributor can start without asking a follow-up question.

**Independent Test**: Pick any finding at random and open a scoped remediation task from it alone.

**Note**: This phase enriches the findings produced in Phase 3; it does not re-audit them.

- [ ] T031 [US2] Audit every finding in `specs/002-production-readiness-audit/audit-report.md` for a `resolution_condition` that is *checkable* rather than arguable, rewriting any that reads as advice ("consider adding tests") into an observable end state.
- [ ] T032 [US2] Assign `free_tier_feasible` (`YES`/`NO`/`UNKNOWN`) to every finding in `specs/002-production-readiness-audit/audit-report.md` and enforce the calibration rule that `NO` forces at least S1 — under this launch target an unaffordable fix is a blocker.
- [ ] T033 [US2] Populate `blocked_by` across findings in `specs/002-production-readiness-audit/audit-report.md` and verify the graph is acyclic; a cycle is a modeling error to resolve before publishing.
- [ ] T034 [US2] Write §7 Remediation Sequence in `specs/002-production-readiness-audit/audit-report.md` — blocking findings in dependency order, with independently startable ones called out. An ordering, not a schedule or an estimate. Depends on T033.
- [ ] T035 [US2] Set `severity_depends_on_assumption` on every finding whose severity turns on the real-money assumption in `specs/002-production-readiness-audit/audit-report.md`, so the "closed testing, no real money" reading is a one-pass re-score rather than a re-audit (spec FR-033).

**Checkpoint**: Every finding is startable work with a stated order.

---

## Phase 5: User Story 3 - Confirm Nothing Unsafe Reaches a Real Shopper (Priority: P2)

**Goal**: Make the safety verdict readable in isolation, and verify the non-negotiables were each
reasoned about individually rather than absorbed into general code quality.

**Independent Test**: Read only the safety and privacy findings and determine whether any path
exists by which a shopper is charged without confirming, or by which a personal photograph leaves
their control.

- [ ] T036 [US3] Verify each constitution NON-NEGOTIABLE — II (safe network outcomes), VI (human authorizes every purchase), VII (photos are private inputs) — has its own individually reasoned finding of compliance, violation, or not-yet-applicable in `specs/002-production-readiness-audit/audit-report.md`, adding any that is missing (spec SC-006).
- [ ] T037 [US3] Cross-check the charge-path enumeration from T012 against `components/purchase-flow.tsx`, `lib/purchase-agent.ts`, and `components/billing/` to confirm **exhaustiveness**, and record in `specs/002-production-readiness-audit/audit-report.md` that every such path is either confirmed human-authorized or filed as a blocking finding (spec SC-007).
- [ ] T038 [US3] Verify the D03 photo-lifecycle trace in `specs/002-production-readiness-audit/audit-report.md` covers consent → derivation → every hop → retention → deletion with no gap, and scan the whole report to confirm no image data or image-derived personal content was reproduced anywhere (Principle VII).
- [ ] T039 [US3] Scan every finding and resolution condition in `specs/002-production-readiness-audit/audit-report.md` for any recommendation that would remove or weaken a safety control, and remove it — spec FR-032 and SC-009 prohibit this outright.
- [ ] T040 [US3] Verify every fallback assessed in T014 carries an honest `verification_state` in `specs/002-production-readiness-audit/audit-report.md`, with untested fallbacks marked `NOT_EXERCISED` rather than `VERIFIED` — the constitution states plainly that an untested fallback does not count.

**Checkpoint**: The safety section stands alone and the non-negotiables are individually accounted
for.

---

## Phase 6: User Story 4 - Measure Progress on a Later Re-Run (Priority: P3)

**Goal**: Make this report comparable to its successors, so remediation progress is demonstrable
rather than asserted.

**Independent Test**: Resolve one finding, re-run the audit, and confirm the two versions show that
finding closed with no dimension silently dropped.

- [ ] T041 [P] [US4] Verify every finding ID in `specs/002-production-readiness-audit/audit-report.md` matches `F-D<nn>-<nn>`, is unique, and is referenced consistently by any `blocked_by` entry.
- [ ] T042 [P] [US4] Write §8 Provenance in `specs/002-production-readiness-audit/audit-report.md` — commands run and results, which quota and pricing claims carry which retrieval dates plus the instruction to re-verify at remediation time, and any dimension-registry amendment made during the run.
- [ ] T043 [P] [US4] Add re-run guidance to §8 of `specs/002-production-readiness-audit/audit-report.md` — surviving findings keep their IDs, closed findings are marked resolved rather than deleted, and only genuinely new findings get new IDs (spec SC-011).
- [ ] T044 [P] [US4] Verify exactly 16 dimensions appear in `specs/002-production-readiness-audit/audit-report.md`, since a differing count invalidates cross-run comparison: `grep -cE '^\| D[0-9]{2} ' specs/002-production-readiness-audit/audit-report.md` must return `16`.

**Checkpoint**: A future re-run is directly comparable to this one.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Execute the validation contract in [quickstart.md](./quickstart.md) — this phase is the
audit's equivalent of a test suite

- [ ] T045 [P] Verify non-mutation with `git status --porcelain -- . ':!specs/'` from the repository root — expected output is empty. Any line is a spec FR-031 violation, not a style issue.
- [ ] T046 [P] Verify the application is exactly as healthy as before the audit by re-running `pnpm build` and `pnpm test` and comparing against `_cmd-build.md` and `_cmd-test.md` (spec SC-010).
- [ ] T047 [P] Verify evidence completeness in `specs/002-production-readiness-audit/audit-report.md` — the count of `#### F-D` finding headers equals the count of `**Evidence**` blocks. A finding without evidence is deleted, not softened (spec SC-003).
- [ ] T048 [P] Verify every `EXTERNAL_TERMS` reference in `specs/002-production-readiness-audit/audit-report.md` carries a `retrieved_at` date; an undated quota claim cannot be trusted or refreshed.
- [ ] T049 Walk the judgment checks in `specs/002-production-readiness-audit/quickstart.md` §Validating — SC-001, SC-004, SC-005, SC-008, SC-012 — and record the outcome of each in §8 Provenance. Depends on T045–T048.
- [ ] T050 Confirm the fragment files under `specs/002-production-readiness-audit/findings/` are retained as working evidence and referenced from §8 Provenance, so any finding can be traced back to the pass that produced it.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on T001 for the verification commands; **blocks all dimension work**
- **User Story 1 (Phase 3)**: Depends on Phase 2. Delivers the MVP
- **User Story 2 (Phase 4)**: Depends on Phase 3 findings existing
- **User Story 3 (Phase 5)**: Depends on Phase 3 findings existing; independent of Phase 4
- **User Story 4 (Phase 6)**: Depends on Phase 3; independent of Phases 4 and 5
- **Polish (Phase 7)**: Depends on all desired stories being complete

### User Story Dependencies

- **US1 (P1)**: The foundation. Every other story operates on findings it produces.
- **US2 (P1)**: Needs US1's findings. Enriches them; never re-audits.
- **US3 (P2)**: Needs US1's findings, particularly D03/D04/D05/D06. Independent of US2 — a
  reviewer can get the safety assurance without the remediation ordering.
- **US4 (P3)**: Needs US1's findings only. Independent of US2 and US3.

**Honest note on independence**: US2, US3, and US4 are independently *testable* and independently
*valuable*, but they are not independently *deliverable* from a standing start — all three operate
on one shared document that US1 creates. This is inherent to a single-artifact deliverable. The
compensating design is the fragment-per-dimension layout, which keeps the expensive work (Phase 3)
parallel.

### Within Each Phase

- Phase 3: all 16 dimension assessments are parallel; assembly (T025–T030) is strictly sequential
  after them, and T030 depends on T025 and T026
- Phase 4: T034 depends on T033; the rest are sequential passes over one file
- Phase 7: T049 depends on T045–T048

### Parallel Opportunities

- **T002, T003** in Setup
- **T004, T005, T006** in Foundational — three independent commands, three separate files
- **T009–T024** — the big one: all 16 dimension assessments, 16 distinct fragment files, zero
  write contention
- **T041–T044** in US4
- **T045–T048** in Polish

Tasks that write to `audit-report.md` (T025–T040, T042–T043) are deliberately **not** marked `[P]`,
because they share one file.

---

## Parallel Example: User Story 1

```bash
# All 16 dimension assessments write to distinct files — launch together:
Task: "Assess D01 Identity into findings/D01-identity-session.md"
Task: "Assess D02 Authoritative State into findings/D02-authoritative-state.md"
Task: "Assess D03 Private Media into findings/D03-private-media.md"
Task: "Assess D04 Purchase Authorization into findings/D04-purchase-authorization.md"
# ... through D16
Task: "Assess D16 Service-Tier Viability into findings/D16-service-tier-viability.md"

# Then assembly runs sequentially against the single report file.
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup → 2. Phase 2 Foundational → 3. Phase 3 User Story 1
4. **STOP and VALIDATE**: hand §1 to someone unfamiliar with the repository and confirm they can
   state the decision and its top blockers in under five minutes
5. The launch decision is now answerable. Everything after this improves actionability, safety
   assurance, and comparability — not correctness of the verdict.

### Incremental Delivery

1. Setup + Foundational → evidence base captured
2. US1 → **the verdict** (MVP — deliverable on its own)
3. US2 → findings become startable work with a remediation order
4. US3 → the safety section stands alone for a reviewer
5. US4 → the report becomes comparable across runs
6. Polish → validation contract executed

### Parallel Team Strategy

1. Everyone completes Setup + Foundational
2. Split Phase 3 by dimension group — the registry already groups them:
   - Reviewer A: safety and correctness (D01–D05, D13)
   - Reviewer B: resilience and operations (D06, D07, D10, D12, D16)
   - Reviewer C: engineering discipline (D08, D09, D11, D14, D15)
3. One person assembles (T025–T030), since the report is a single file
4. US2, US3, US4 can then proceed in parallel by different reviewers

---

## Notes

- The repository outside `specs/` is read-only for the entire audit (spec FR-031). T045 verifies it.
- Never copy image data, image-derived personal content, or secret values into any artifact
  (Principle VII). The finding schema deliberately has nowhere to put them.
- Any claim that a Next.js 16 API is misused must cite `node_modules/next/dist/docs/`, indexed in
  T008. Recollection is not evidence.
- Phase 0 already found two likely blockers (SerpApi quota, Vercel commercial-use terms). T024 must
  **re-derive and verify** them rather than copying `research.md` — pre-adjudicated findings are how
  audits get things wrong.
- `NOT_READY` is the expected first-run verdict. It is an expectation, not a target; the value is
  the evidenced, ordered list of what would have to change.
