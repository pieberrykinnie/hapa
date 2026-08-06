# Feature Specification: Production Readiness Audit

**Feature Branch**: `claude/github-spec-kit-setup-c32681`

**Created**: 2026-08-05

**Status**: Draft

**Input**: User description: "Fully audit this repository on its production readiness"

## Overview

HAPA today is a demonstration prototype. It runs a voice-steerable shopping feed with device-local
onboarding, and its own feature spec declares **Prototype Mode**: name, photo preview, five
calibration decisions, style preferences, and payment preference live only in one browser's local
storage. The HAPA Constitution permits that as a delivery-stage exception and simultaneously names
what must be true before the same experience may serve real shoppers and real money.

This feature produces the assessment that closes the gap between those two states: a complete,
evidence-backed audit of what stands between this repository and a production launch, expressed as
a verdict a decision-maker can act on and a backlog a contributor can execute.

The audit assesses; it does not repair. Fixing what it finds is separate, subsequent work.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Decide Whether HAPA Can Ship (Priority: P1)

As the person accountable for launching HAPA, I want a single clear verdict on whether this
repository can serve real shoppers, backed by the specific reasons it cannot, so that I can make a
launch decision without reading the whole codebase myself.

**Why this priority**: This is the question that was asked. Every other part of the audit is
support for it. A verdict with reasons is, on its own, a complete and useful deliverable.

**Independent Test**: Give the finished audit to someone who has never seen the repository and ask
them, "Can this ship, and why not?" They can answer correctly from the summary alone, without
opening a source file.

**Acceptance Scenarios**:

1. **Given** a completed audit, **When** a decision-maker opens it, **Then** an overall
   production-readiness verdict appears before any detailed findings.
2. **Given** an overall verdict of "not ready", **When** the decision-maker reads further,
   **Then** every condition blocking readiness is listed explicitly, with no blocker implied only
   by omission.
3. **Given** a readiness dimension the audit examined, **When** the decision-maker looks for it,
   **Then** that dimension carries its own verdict rather than being absorbed into a general
   impression.
4. **Given** a dimension that could not be assessed, **When** the decision-maker reads it,
   **Then** it is reported as "unable to assess" with the reason, and is never silently counted as
   passing.
5. **Given** the audit is complete, **When** the decision-maker checks its scope, **Then** the
   definition of "production" the audit judged against is stated in the document itself.

---

### User Story 2 - Know Exactly What to Fix First (Priority: P1)

As a contributor, I want each finding to tell me what is wrong, where, how bad it is, and what
"fixed" looks like, so that I can start work immediately instead of re-investigating.

**Why this priority**: An audit whose findings cannot be acted on changes nothing. This slice turns
the verdict into work, and it is testable independently of how the verdict was reached.

**Independent Test**: Select any finding at random and attempt to open a remediation task from it
alone. The task can be scoped and started without asking the auditor a follow-up question.

**Acceptance Scenarios**:

1. **Given** any finding, **When** a contributor reads it, **Then** it names the concrete location
   or the specific missing artifact it concerns.
2. **Given** any finding, **When** a contributor reads it, **Then** it states a severity drawn from
   a scheme the document defines.
3. **Given** any finding, **When** a contributor reads it, **Then** it describes the observable
   condition that would make the finding resolved.
4. **Given** the full set of findings, **When** a contributor sorts by severity, **Then** the
   launch-blocking items are separable from the items that merely improve quality.
5. **Given** a finding about something not yet built, **When** a contributor reads it, **Then** it
   is distinguishable from a finding about something built incorrectly.
6. **Given** two findings with a dependency between them, **When** a contributor plans work,
   **Then** the ordering constraint is stated rather than left to be inferred.

---

### User Story 3 - Confirm Nothing Unsafe Reaches a Real Shopper (Priority: P2)

As a reviewer responsible for shopper safety, I want the audit to test this repository against
HAPA's own non-negotiable commitments about money and personal photographs, so that no shortcut
taken for the demo can quietly follow the product into production.

**Why this priority**: The project's governing document marks purchase authorization and private
photo handling as non-negotiable. These carry consequences that outlive a bad demo, so they are
assessed explicitly rather than as a subset of general code quality.

**Independent Test**: Read only the safety and privacy portion of the audit and determine whether
any path exists by which a shopper is charged without confirming, or by which a personal photograph
leaves the shopper's control. The answer is derivable from that section alone.

**Acceptance Scenarios**:

1. **Given** the audit is complete, **When** a reviewer looks for the constitution's non-negotiable
   principles, **Then** each one has its own explicit finding of compliance, violation, or
   not-yet-applicable, with the reason recorded.
2. **Given** any path that could result in a charge, **When** the reviewer traces it, **Then** the
   audit states whether an explicit human confirmation precedes it.
3. **Given** any handling of an uploaded personal photograph, **When** the reviewer traces it,
   **Then** the audit states where that image travels, where it is retained, and whether the
   shopper can remove it.
4. **Given** the repository declares Prototype Mode, **When** the reviewer checks the user-facing
   experience, **Then** the audit reports whether the interface's claims about security, accounts,
   and payment availability match what the code actually does.
5. **Given** a failure in an authentication or payment path, **When** the reviewer checks the
   audit, **Then** the audit reports whether that failure can be presented to a shopper as success.

---

### User Story 4 - Measure Progress on a Later Re-Run (Priority: P3)

As a maintainer working through the backlog, I want a later audit to be comparable to this one, so
that I can show what has actually improved rather than restating opinions.

**Why this priority**: Valuable but not required for the first decision. The initial audit delivers
its value the day it is written; comparability pays off only once remediation is underway.

**Independent Test**: Resolve one finding, re-run the audit, and confirm the two versions can be
compared to show that finding closed and no dimension silently dropped.

**Acceptance Scenarios**:

1. **Given** a completed audit, **When** it is re-run later, **Then** the same readiness dimensions
   are assessed, so absence of a dimension in the newer report signals a real change and not a
   change in method.
2. **Given** two audit runs, **When** they are compared, **Then** each finding is identifiable
   across runs.
3. **Given** an audit report, **When** a reader checks its provenance, **Then** the date and the
   exact repository state it describes are recorded in the document.

---

### Edge Cases

- What happens when a readiness dimension cannot be evaluated because the capability does not exist
  yet at all — for example, an authentication system to assess? The dimension is reported as a gap
  against the production bar, not as a pass and not as inapplicable.
- What happens when the safest production behavior is the *absence* of a feature, such as real
  checkout being deliberately disabled during Prototype Mode? The audit records the current state as
  intentionally deferred and identifies what its later arrival will require, without scoring a
  deliberate omission as a defect.
- How does the audit handle a control that exists but has never been exercised, such as a fallback
  path with no test covering it? An unverified control is reported as unverified, distinct from both
  working and broken.
- What happens when documentation, the feature spec, and the running code disagree about the same
  behavior? The disagreement is itself a finding, and the audit records what the code actually does.
- How does the audit treat a risk carried by an external service rather than this repository, such
  as a third-party voice or product-search provider going down? It is assessed for how this
  repository behaves when that service fails, not for the provider's own reliability.
- What happens when a fix for one finding would violate a different constitutional principle? The
  conflict is surfaced for a human decision rather than resolved inside the audit.
- What happens when a severity judgment depends on the production definition being assumed? The
  finding states that dependency so a narrower launch target can be re-scored without a full re-run.

## Requirements *(mandatory)*

### Functional Requirements

**Verdict and structure**

- **FR-001**: The audit MUST state one overall production-readiness verdict and place it ahead of
  detailed findings.
- **FR-002**: The audit MUST state a separate verdict for every readiness dimension it covers.
- **FR-003**: The audit MUST define the severity scheme it uses, including which severities block a
  launch.
- **FR-004**: The audit MUST state, in the document, the definition of "production" it judged
  against.
- **FR-005**: The audit MUST record the date and the exact repository state it describes.

**Evidence and honesty**

- **FR-006**: Every finding MUST cite concrete evidence — a specific location in the repository, or
  the specific absence of an expected artifact.
- **FR-007**: The audit MUST NOT record a dimension as passing on the basis of absent evidence;
  unexamined and unexaminable dimensions MUST be reported as such with a reason.
- **FR-008**: The audit MUST distinguish capabilities that are missing from capabilities that are
  present but incorrect.
- **FR-009**: The audit MUST distinguish controls verified to work from controls that exist but are
  unverified.
- **FR-010**: The audit MUST report any disagreement it finds between documented behavior and actual
  behavior, and MUST treat the actual behavior as authoritative.

**Actionability**

- **FR-011**: Every finding MUST describe the observable condition that would resolve it.
- **FR-012**: Every finding MUST carry a severity from the defined scheme.
- **FR-013**: Findings MUST be ordered or otherwise separable so blocking work is distinguishable
  from optional improvement.
- **FR-014**: Where one finding must be resolved before another, the audit MUST state the ordering
  constraint.
- **FR-015**: Each finding MUST be identifiable across audit runs so progress can be compared.

**Required coverage**

- **FR-016**: The audit MUST assess identity and session integrity, including whether personal data
  and purchase history can be attributed to an account rather than to a device.
- **FR-017**: The audit MUST assess where authoritative state is persisted, and MUST report any case
  where identity, payment status, or orders depend on state the shopper's browser can clear.
- **FR-018**: The audit MUST assess handling of uploaded personal photographs across their full
  lifecycle: consent, what is derived from them, where they travel, retention, and shopper-initiated
  removal.
- **FR-019**: The audit MUST assess every path that can result in a charge, and MUST report whether
  explicit human confirmation of the exact purchase precedes it.
- **FR-020**: The audit MUST assess whether any authentication, payment, or order outcome can be
  presented to a shopper as more successful or more certain than it actually is.
- **FR-021**: The audit MUST assess the behavior of every external-dependency failure path,
  including whether a declared fallback exists and whether it has been exercised.
- **FR-022**: The audit MUST assess secret and privileged-credential handling, including whether any
  secret is reachable from the shopper's browser and whether required configuration is documented.
- **FR-023**: The audit MUST assess the automated gates that protect the main branch — build, type,
  lint, and test execution — and MUST report whether they run without relying on a person to
  remember.
- **FR-024**: The audit MUST assess test coverage relative to the paths that carry money, personal
  data, and irreversible actions, rather than as an aggregate percentage.
- **FR-025**: The audit MUST assess what an operator can observe and do when something fails in
  production, including whether a failure would be noticed at all.
- **FR-026**: The audit MUST assess accessibility and device or browser variation for the primary
  shopper journey, including the experience when a permission-gated input such as a microphone is
  refused or unavailable.
- **FR-027**: The audit MUST assess whether the latency commitments the project set for itself are
  enforced, and MUST report whether an expired timing budget can be converted into a false success.
- **FR-028**: The audit MUST assess user-facing claims and disclosures for accuracy, including any
  statement about accounts, security, data location, or payment availability.
- **FR-029**: The audit MUST assess whether documentation is sufficient for a new operator to
  configure, run, and deploy the project.
- **FR-030**: The audit MUST assess dependency and supply-chain posture, including whether
  dependency versions are reproducible.
- **FR-035**: The audit MUST assess whether each external service tier the project depends on
  permits the intended production use under its terms, and whether its quota ceiling accommodates
  the expected user volume for a full billing period. Findings MUST quantify expected consumption
  per user journey rather than asserting sufficiency.

**Boundaries**

- **FR-031**: The audit MUST NOT modify application behavior; it is an assessment and produces no
  remediation.
- **FR-032**: The audit MUST NOT recommend removing or weakening a safety control in order to reach
  a passing verdict.
- **FR-033**: Where a finding's severity depends on the assumed production definition, the audit
  MUST state that dependency.
- **FR-034**: Where remediating one finding would conflict with a stated project principle, the
  audit MUST surface the conflict for a human decision instead of resolving it.

### Key Entities

- **Audit Report**: The single deliverable. Carries the overall verdict, the production definition
  it used, the date and repository state assessed, the severity scheme, and all findings.
- **Readiness Dimension**: One area of production readiness under assessment — identity, persistence,
  private media, commerce safety, dependency resilience, configuration and secrets, quality gates,
  test adequacy, operability, accessibility, latency, disclosure accuracy, documentation, supply
  chain. Each holds its own verdict.
- **Finding**: One observed gap or risk. Belongs to a dimension; carries a stable identifier, a
  severity, evidence, a resolution condition, whether it is a missing capability or an incorrect one,
  and any ordering dependency on other findings.
- **Severity**: The defined ranking that separates launch-blocking findings from those that do not
  block launch.
- **Evidence Reference**: The concrete basis for a finding — a location in the repository or a
  specific expected artifact shown to be absent.
- **Verdict**: The readiness judgment attached to the report as a whole and to each dimension,
  including an explicit "unable to assess" state.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A reader who has never seen this repository can state the launch decision and its top
  three blocking reasons within 5 minutes of opening the audit.
- **SC-002**: 100% of readiness dimensions carry an explicit verdict; zero are left unaddressed.
- **SC-003**: 100% of findings cite at least one concrete piece of evidence.
- **SC-004**: An independent reviewer can locate the evidence behind any randomly selected finding
  in under 2 minutes, and confirms it in at least 9 of 10 attempts.
- **SC-005**: 100% of findings state the condition that would resolve them.
- **SC-006**: 100% of the project's non-negotiable principles receive an explicit, individually
  reasoned finding.
- **SC-007**: Every path that can result in a charge is accounted for, and each is confirmed either
  to require explicit human confirmation or to be recorded as a blocking finding.
- **SC-008**: A contributor can open a scoped remediation task from any finding without asking the
  auditor a clarifying question, in at least 9 of 10 attempts.
- **SC-009**: Zero findings recommend removing or weakening a safety control.
- **SC-010**: Application behavior is unchanged by the audit: the project builds and its tests pass
  exactly as they did before the audit began.
- **SC-011**: A re-run after remediation reports the same dimension set and identifies which
  findings closed, which remain, and which are new.
- **SC-012**: Zero dimensions are reported as passing where the underlying capability does not exist.

## Assumptions

These defaults were chosen where the one-line request did not specify. Each can be changed, and the
first two would change the audit's scope and severity ratings materially.

- **The launch target is free-tier infrastructure at roughly five real users.** *(Amended
  2026-08-05 during planning, on explicit user instruction.)* The safety and privacy bar remains the
  HAPA Constitution v2.1.0 and the `SPEC.md` Definition of Done — real shoppers, account-backed
  storage, private photo handling, genuine payment execution. What the constraint changes is the
  other two axes: the **scale** bar drops to near zero, and **cost becomes a correctness property**
  rather than a preference. A finding whose only remediation requires paid infrastructure is a
  blocker, not a recommendation. Conversely, a finding that only matters at hundreds of users does
  not block launch. See [research.md](./research.md) §R1–R2 for the resulting severity calibration.
- **Real money is assumed to be in scope.** The user did not say whether the five users transact.
  The audit assumes they do, because it is the safe direction: it produces a superset of findings,
  and FR-033 requires every severity depending on this to declare it, so the narrower "closed
  testing, no real money" reading is a one-pass re-score rather than a re-audit.
- **The audit assesses and does not repair.** The deliverable is findings, not fixes. Remediation is
  expected to follow as separately planned work informed by this audit's backlog.
- **Prototype Mode is a known, deliberate state, not a discovery.** The device-local persistence
  model is declared in `specs/001-voice-shopping-feed/spec.md` and permitted by the constitution's
  Local Prototype Exception. The audit's job is to state precisely what that choice costs at the
  production bar, not to report it as a surprise defect.
- **The repository is the subject.** The audit covers this codebase, its configuration, its
  documentation, and its declared dependencies. Third-party providers are assessed only through how
  this repository behaves when they fail, degrade, or change.
- **Findings about unbuilt capabilities are in scope.** Because the production bar includes
  capabilities the prototype has not yet built, their absence is reported as a gap rather than
  excluded for being out of scope.
- **The audience is technical but not steeped in this codebase.** The report is written to be acted
  on by a contributor and understood by a decision-maker, without requiring prior familiarity with
  HAPA's internals.
- **No external compliance regime is assumed.** The audit applies the project's own commitments and
  widely accepted practice for handling payments and personal data. It does not certify against a
  named external standard, and it is not a substitute for a formal certification process where one is
  legally required.
