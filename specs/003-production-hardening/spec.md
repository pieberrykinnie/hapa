# Feature Specification: Production Hardening — Decide What's Real

**Feature Branch**: `003-production-hardening`

**Created**: 2026-08-06

**Status**: Draft

**Input**: User description: "Harden HAPA toward a defensible production v1, closing the blocking
findings from the 002-production-readiness-audit under a deliberately redefined scope — this is
not 'unfake everything,' it's 'decide what's real.'"

## Overview

The production readiness audit (`specs/002-production-readiness-audit/audit-report.md`) found 14
launch-blocking issues. Several of those findings exist only because the audited prototype
*simulates* capabilities it doesn't really have — an in-app checkout that never charges anyone, a
"reading your photo" analysis that never looks at the photo. Reflexively "unfaking" every simulated
capability would be irresponsible: real payment execution is a large, separate undertaking with its
own risk profile, and not every simulation deserves to become real.

This feature makes that judgment call explicitly, capability by capability, and then closes every
remaining blocking finding that judgment call doesn't retire. Three decisions anchor it:

1. **Buy Now stops simulating a purchase and becomes an honest link to the real listing.** HAPA
   never charges anyone in this version. This resolves three audit findings by removing the
   capability that caused them, not by building a payment system.
2. **The photo-vibe-shift feature stops faking its analysis and starts performing one.** Where the
   checkout simulation is retired, this one is completed — a real vision-capable analysis replaces
   the hardcoded result.
3. **Identity and persistence remain device-local.** This version does not add accounts or
   server-side storage. Prototype Mode continues exactly as already declared, honestly disclosed,
   and permitted by the constitution's Local Prototype Exception.

Every other audit finding classified as blocking is addressed in this feature, scoped against this
narrower shape — a real, honestly-behaved product that makes no payment and holds no account, rather
than the audit's original assumption of a fully account-backed, payment-processing production system.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Buy the Real Item From the Real Seller (Priority: P1)

As a shopper, I want "Buy now" to take me straight to the real product listing so that I can
actually complete a purchase, instead of watching a checkout animation that doesn't buy anything.

**Why this priority**: This is the single highest-trust change in the feature. The audit's most
severe correctness findings (a fabricated "Order confirmed" screen, a receipt claimed to be "sent
to email" when no email is ever sent) exist because the current build pretends to complete a
transaction it cannot complete. Removing that pretense is the precondition for every other honesty
claim in this feature meaning anything.

**Independent Test**: Tap "Buy now" on any product — SerpApi-sourced or curated — and verify the
shopper lands on that product's real, live listing page on the actual merchant's site, with no
intermediate screen implying HAPA processed a payment.

**Acceptance Scenarios**:

1. **Given** a shopper viewing any product card or product detail page, **When** they tap "Buy
   now," **Then** HAPA opens that product's real merchant link in a new browser tab or window,
   leaving the feed intact behind it.
2. **Given** a shopper has tapped "Buy now" for a product, **When** they return to HAPA, **Then**
   the interface reflects that they viewed this item's real listing (e.g. a "View listing again"
   label) without ever claiming a purchase, payment, or order was completed by HAPA.
3. **Given** a shopper taps "Buy now" a second time for the same product, **When** the link opens,
   **Then** the second visit is recorded exactly as the first was, with no loss of the earlier
   record — unlike the current build, where a second purchase silently erased the first one's
   record.
4. **Given** any product in the feed, **When** its real merchant link is unavailable, malformed, or
   missing, **Then** HAPA does not offer a non-functional "Buy now" action for that product, or
   states plainly that this item cannot currently be opened at the merchant.
5. **Given** a shopper viewing the product page or a completed-purchase-adjacent screen, **When**
   they look for financial claims (receipts, confirmation numbers, "sent to email," charge
   amounts), **Then** none appear anywhere in HAPA's interface, because HAPA has not processed a
   payment.

---

### User Story 2 - Get a Real Read on a Photo's Vibe (Priority: P1)

As a shopper, I want the "show hapa a vibe" photo tool to genuinely look at my photo so that the
feed shift it produces actually reflects what I showed it, instead of always producing the same
result regardless of the picture.

**Why this priority**: The audit verified this feature's current copy — "Reading your photo for
colors, textures, and style…" — is false for every use: the outcome is a hardcoded constant no
matter what photo is chosen. This is a live, user-facing false claim, distinct in kind from the
checkout findings because here the fix is to deliver the capability, not retire it.

**Independent Test**: Submit two visually distinct photos (e.g. one dominated by warm earth tones,
one dominated by cool neon colors) through the feature and verify the resulting feed shifts differ
in a way that plausibly reflects each photo's actual visual content.

**Acceptance Scenarios**:

1. **Given** a shopper selects a photo in this feature, **When** analysis completes, **Then** the
   feed shift applied (added keywords, excluded attributes) is derived from that specific photo's
   visual content, not from a fixed constant shared by every submission.
2. **Given** two shoppers submit visually different photos, **When** each analysis completes,
   **Then** the two resulting feed shifts are not identical to each other by construction — they
   may coincidentally overlap, but nothing in the system forces them to match.
3. **Given** the analysis service is unavailable, times out, or returns an unusable result, **When**
   the shopper is waiting, **Then** HAPA shows an honest failure state and a working fallback (e.g.
   the existing typed-text vibe input), and never silently substitutes a fixed or fabricated result
   while claiming analysis occurred.
4. **Given** the photo analysis is running, **When** the shopper sees the "reading your photo"
   status text, **Then** that text remains accurate to what is actually happening for the entire
   duration a result can take to arrive, including the failure case in Scenario 3.
5. **Given** a submitted photo, **When** it is analyzed, **Then** the analysis extracts only
   shopping-relevant visual signals (colors, materials, silhouettes, aesthetics) and never performs
   face recognition, biometric templating, or identifies or infers protected traits about a person
   in the photo — consistent with the constitution's existing photo-privacy principle.

---

### User Story 3 - Trust the Feed Even When Product Discovery Struggles (Priority: P1)

As a shopper, I want the product feed to keep working smoothly even if live product search is slow,
unavailable, or has run out of its monthly allowance, so that I never see a broken or empty feed.

**Why this priority**: The feed's fallback behavior was found by the audit to be well-built but
never verified to actually work — and separately, the live search service's free-tier allowance was
found not to comfortably cover ordinary use at this product's scale. Both risks land on the same
user-facing moment: opening the feed. This is P1 because the feed is HAPA's primary surface.

**Independent Test**: Force the live product-search path to be unavailable (simulating an outage,
a missing configuration, or an exhausted monthly allowance) and confirm the feed still returns a
full page of relevant products with no visible degradation, verified by an automated test rather
than manual inspection alone.

**Acceptance Scenarios**:

1. **Given** live product search is unavailable for any reason, **When** the shopper opens or
   scrolls the feed, **Then** a full page of relevant products still appears, drawn from the
   curated fallback catalogue, and this behavior is exercised by an automated test.
2. **Given** the feed is operating normally, **When** the number of live product searches made in
   the current month approaches the search provider's allowance, **Then** the system's actual
   consumption per typical shopper session has been measured and confirmed to leave comfortable
   headroom within that allowance at the expected number of shoppers, or consumption has been
   reduced to make that true.
3. **Given** the monthly search allowance is exhausted before the month resets, **When** shoppers
   continue browsing, **Then** the feed continues serving relevant products from the fallback
   catalogue rather than failing or showing a degraded experience.

---

### User Story 4 - Trust Voice Steering Not to Get Stuck (Priority: P2)

As a shopper using voice to redirect the feed, I want the voice tool to fail fast and offer a
working alternative if it can't connect, so that I'm never stuck waiting with no way forward.

**Why this priority**: Voice is a secondary interaction mode; a shopper who cannot get it working
can already fall back to typing. The gap here is narrower than User Story 3's: every voice failure
mode already has a graceful fallback except one — a connection attempt that neither succeeds nor
explicitly fails.

**Independent Test**: Simulate a voice connection attempt that never completes (neither connects
nor errors) and verify the interface automatically offers the typed-text alternative after a bounded
wait, rather than showing an indefinite "connecting" state.

**Acceptance Scenarios**:

1. **Given** a shopper opens voice steering, **When** the connection neither succeeds nor fails
   within a bounded, reasonable time, **Then** HAPA automatically treats this as a failure and
   offers the same typed-text fallback already shown for a denied microphone or a connection error.
2. **Given** the voice service's usage allowance for this deployment is running low, **When** that
   threshold is crossed, **Then** the situation is recorded somewhere an operator can find it,
   consistent with User Story 5's operability requirement, rather than being discovered only when
   voice stops working for a shopper.

---

### User Story 5 - Give an Operator Something to Watch (Priority: P2)

As the person responsible for running HAPA, I want to find out when something breaks — a failed
dependency, an exhausted quota, a bug — without waiting for a shopper to mention it, so that I can
respond before it affects everyone using the app.

**Why this priority**: Every other user story fixes a specific failure mode. This one ensures a
*new*, unanticipated failure doesn't go unnoticed the way the audit found every current failure
mode already does — zero server-side error visibility exists today.

**Independent Test**: Trigger a server-side error deliberately (e.g. an unhandled exception in a
route handler) and confirm a record of it is retrievable by an operator without needing shopper
reports, without that record ever containing photo content or other personal data.

**Acceptance Scenarios**:

1. **Given** a server-side error occurs in any API route, **When** it happens, **Then** an operator
   can find a record of it — what failed and roughly when — without relying on a shopper reporting
   it.
2. **Given** an error record is captured, **When** an operator or anyone else reviews it, **Then**
   it never contains photo bytes, image-derived personal content, or any other content the
   constitution treats as private — only what is needed to diagnose the failure.
3. **Given** the product-search or voice usage allowances discussed in User Stories 3 and 4
   approach exhaustion, **When** that threshold is crossed, **Then** the same operator-visible
   record surfaces it.

---

### User Story 6 - Trust That a Passing Build Actually Means Something (Priority: P2)

As a contributor, I want the project's build, test, and lint checks to run automatically on every
change, so that a broken change cannot reach the main branch just because no one happened to run the
checks locally first.

**Why this priority**: The audit found this project's own stated merge bar ("`pnpm build` passes")
has no mechanical enforcement, and separately found the standard reproducible-install command fails
outright on a clean checkout. Both undermine every other guarantee in this feature — a hardening
effort whose own gates cannot be trusted to run isn't finished hardening.

**Independent Test**: Push a change that fails the build, and confirm that failure is visible and
blocks merge, without anyone needing to run the build locally first. Separately, run the standard
dependency-install command on a clean checkout and confirm it succeeds.

**Acceptance Scenarios**:

1. **Given** a change is proposed, **When** it fails to build, fails a test, or fails lint,
   **Then** that failure is automatically visible and merging is blocked, without requiring a human
   to have run the checks locally.
2. **Given** a clean checkout of this repository, **When** the standard, reproducible dependency-
   install command is run, **Then** it succeeds without modifying the checked-in dependency
   lockfile.
3. **Given** the automated checks exist, **When** the feed's fallback behavior (User Story 3), the
   purchase-link behavior (User Story 1), and the voice-connection timeout (User Story 4) are each
   implemented, **Then** each is covered by at least one automated test that fails if the behavior
   regresses.

---

### Edge Cases

- What happens if a product's real merchant link points to a listing that is later removed or
  changed by the merchant? HAPA is not responsible for the destination page's own availability;
  User Story 1's requirement is that HAPA sends the shopper to the correct current link it has, not
  that the destination remains valid forever.
- How does the system distinguish "I clicked through to buy this" from an actual purchase, now that
  HAPA cannot know whether the shopper completed anything on the merchant's site? It doesn't, and
  must not claim to — any local marker records only that the shopper opened the listing, worded
  accordingly (see Assumptions).
- What happens if the vision-analysis service in User Story 2 is reachable but returns a result
  unrelated to shopping (e.g. a person's face, a document, a screenshot with no clear visual
  attributes)? The analysis must degrade to the same "shopping-relevant signals only" constraint
  that governs the existing filename-based onboarding photo path — never inferring identity or
  protected traits — and if no usable shopping signal can be extracted, this is treated as the
  failure case in User Story 2's Scenario 3, not as a fabricated shift.
- What happens when a shopper is offline entirely, not just when one dependency is down? Every user
  story here concerns individual service degradation; full offline operation is out of scope, but no
  user story here should make a fully-offline session behave worse than it does in the current
  build.
- What happens to the existing purchase-record data structure and screens that this feature retires
  (the simulated checkout confirmation, the fabricated receipt)? They are removed, not hidden behind
  a flag — leaving dead, misleading code in place would recreate the audit's own finding about a
  dormant, divergent implementation elsewhere in this codebase.
- What happens if the operator-visible error record (User Story 5) itself fails to write (e.g. the
  logging service is down)? This is treated as a lower-priority failure than the original error —
  the shopper-facing experience must not additionally degrade because the observability layer had a
  problem.

## Requirements *(mandatory)*

### Functional Requirements

**Honest checkout (User Story 1)**

- **FR-001**: The system MUST replace the simulated in-app checkout with a direct link to each
  product's real merchant listing when the shopper chooses to buy.
- **FR-002**: The system MUST NOT display any claim that a payment, charge, order, or receipt was
  processed by HAPA, for any product, under any circumstance, once this feature is complete.
- **FR-003**: The system MUST remove the simulated purchase-agent capability and its associated
  fabricated confirmation and receipt screens entirely, rather than leaving them dormant or
  unreachable in the codebase.
- **FR-004**: The system MUST record, per product per shopper device, that the shopper opened that
  product's real listing, and MUST NOT lose an earlier record when the same product is opened again.
- **FR-005**: The system MUST NOT offer a "Buy now" action for a product whose real merchant link is
  missing or malformed; it MUST either omit the action or state that this item cannot currently be
  opened at the merchant.

**Real photo-vibe analysis (User Story 2)**

- **FR-006**: The system MUST derive the feed shift produced by the photo-vibe-shift feature from
  the actual visual content of the shopper's submitted photo.
- **FR-007**: The system MUST limit that analysis to shopping-relevant visual signals (colors,
  materials, silhouettes, aesthetics) and MUST NOT perform face recognition, construct a biometric
  template, or infer a protected or sensitive trait — matching the constraint the constitution
  already applies to onboarding photo handling.
- **FR-008**: The system MUST show an honest failure state, with a working fallback to the existing
  typed-text vibe input, whenever the photo analysis cannot produce a usable result — and MUST NOT
  substitute a fixed or fabricated shift while claiming analysis occurred.
- **FR-009**: Any status text shown while analysis is in progress MUST remain accurate to what is
  actually happening, including when the outcome is the failure case in FR-008.
- **FR-023**: *(Added during planning; numbered out of sequence so identifiers already referenced
  elsewhere stay stable — the same convention `specs/002-production-readiness-audit/spec.md`'s
  FR-035 established.)* Because performing genuine analysis (FR-006) requires the submitted photo
  to leave the shopper's device for the first time in this feature's history, the disclosure shown
  before a shopper submits a photo to this specific feature MUST accurately state that the photo is
  sent to a server-side analysis service. It MUST NOT carry or imply an on-device-only or
  never-uploaded claim once this feature ships. This requirement applies only to the
  photo-vibe-shift feature; the separate onboarding photo flow's on-device, filename-only
  processing and its accurate "never uploaded" disclosure are unchanged by this feature and MUST
  NOT be altered to match.

**Feed resilience and quota safety (User Story 3)**

- **FR-010**: The system MUST have an automated test that forces the live product-search path
  unavailable and asserts the feed still returns a full page of relevant products from the fallback
  catalogue.
- **FR-011**: The system MUST have measured or reduced its live product-search consumption per
  typical shopper session so that expected usage at this product's target scale leaves comfortable
  headroom within the search provider's monthly and hourly allowances.
- **FR-012**: The system MUST continue serving the fallback catalogue, without degradation, for the
  remainder of any period in which the live search allowance is exhausted.

**Reliable voice steering (User Story 4)**

- **FR-013**: The system MUST apply a bounded maximum wait for a voice connection attempt to
  succeed or fail, and MUST automatically transition to the existing typed-text fallback if that
  bound is reached without a definite outcome.
- **FR-014**: The system MUST surface an operator-visible signal when the voice service's usage
  allowance for this deployment approaches exhaustion.

**Operability (User Story 5)**

- **FR-015**: The system MUST capture a retrievable record of any server-side error, without
  requiring a shopper to report it.
- **FR-016**: Error records captured under FR-015 MUST NOT contain photo bytes, image-derived
  personal content, or any other content the constitution treats as private.
- **FR-017**: The quota-approaching signals required by FR-011/FR-014 (product search and voice
  usage) MUST surface through the same operator-visible mechanism as FR-015.

**Automated quality gates (User Story 6)**

- **FR-018**: The system MUST automatically run its build, test, and lint checks on every proposed
  change and MUST block merging when any of them fail, without depending on a person running them
  locally first.
- **FR-019**: The standard, reproducible dependency-install command MUST succeed on a clean checkout
  without modifying the checked-in dependency lockfile.
- **FR-020**: The feed-fallback behavior (FR-010), the purchase-link behavior (FR-001–FR-005), and
  the voice-connection timeout (FR-013) MUST each be covered by at least one automated test that
  fails if the behavior regresses.

**Boundaries**

- **FR-021**: The system MUST NOT add user accounts, authentication, or server-side persistence of
  shopper identity, preferences, or activity in this feature — Prototype Mode's device-local model
  continues unchanged.
- **FR-022**: Any user-facing disclosure about Prototype Mode, data location, or account status that
  exists today MUST remain accurate and MUST NOT be weakened by this feature's changes.

### Key Entities

- **Listing Visit**: A record that a shopper opened a specific product's real merchant link on this
  device. Replaces the current Purchase Record. Holds no claim of payment, charge, or order — only
  that the listing was opened, and when.
- **Vibe Photo Analysis**: The result of analyzing a shopper-submitted photo for shopping-relevant
  visual signals, used to produce a feed shift. Distinct from the existing onboarding photo profile;
  scoped to this one feature's single-photo, in-the-moment use.
- **Operator Error Record**: A retrievable entry describing a server-side failure or an
  approaching-usage-allowance signal, deliberately excluding any private content.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of "Buy now" interactions across the app open the product's real merchant
  listing; 0% display any payment, charge, order, or receipt claim.
- **SC-002**: Two visibly different photos submitted through the vibe-shift feature produce
  different analysis results in at least 9 of 10 trials using clearly distinct sample images.
- **SC-003**: The feed returns a full page of relevant products within the same time budget,
  whether live product search is available or not, verified by an automated test that exercises the
  unavailable case.
- **SC-004**: Measured live product-search consumption for a representative shopper session, at the
  target number of concurrent shoppers, uses less than 80% of the provider's monthly and hourly
  allowances.
- **SC-005**: A stalled voice-connection attempt reaches the typed-text fallback automatically,
  every time, within the bounded wait — 0% of stalled attempts leave the shopper stuck.
- **SC-006**: 100% of deliberately triggered server-side errors during testing produce a retrievable
  operator record, and 0% of those records contain photo bytes or other private content.
- **SC-007**: 100% of proposed changes to the repository have their build, test, and lint results
  visible automatically, without a person needing to run them locally to find out.
- **SC-008**: A clean checkout followed by the standard dependency-install command succeeds without
  modifying the checked-in lockfile, verified on every such install.
- **SC-009**: Zero references to the retired simulated-checkout capability (its screens, its
  fabricated receipt, its purchase-record data shape) remain reachable in the shipped application.

## Assumptions

- **A lightweight "opened this listing" marker replaces the retired purchase record**, rather than
  no record at all — this preserves useful UI behavior (e.g. distinguishing "Buy now" from "View
  listing again") without claiming anything about payment. The audit left this specific detail
  explicitly open; this default resolves it in the direction that preserves existing UI value at
  minimal scope.
- **The real merchant link opens in a new tab or window**, not a full navigation away from HAPA, so
  the shopper doesn't lose their place in the feed. This is the safer default for a feed-centric
  browsing experience.
- **A vision-capable analysis provider is available and budget-appropriate for this project's
  free-tier constraint**; the exact provider, model, and confirmed free-tier quota are a planning-
  phase research question, resolved the same way the audit independently verified other providers'
  terms (`specs/002-production-readiness-audit/research.md` §R3), not decided in this specification.
- **"Operator-visible" (User Story 5) means retrievable by whoever operates this deployment**, not
  necessarily a dedicated on-call paging system — a lightweight, free-tier-appropriate solution is
  assumed sufficient at this product's five-user scale, consistent with the audit's launch target.
- **This feature does not revisit identity or persistence** (FR-021). The audit's findings on that
  topic (no authentication, no server-side storage) remain open and are explicitly out of scope
  here, per the scoping decision that produced this feature.
- **Reducing product-search consumption (FR-011) may mean fewer live results per feed page, more
  aggressive reliance on the fallback catalogue, or both** — the specific technique is an
  implementation decision for planning; this specification requires only that measured consumption
  ends up within a safe margin of the provider's allowance.
