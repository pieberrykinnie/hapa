# Feature Specification: Personalized Agentic Shopping Feed

**Feature Branch**: `main`

**Created**: 2026-08-05

**Status**: Draft

**Prototype Mode**: The current implementation is device-local. Name, a compressed photo preview, five decisions, style preferences, and payment preference/defer state are stored in this browser's `localStorage`. This mode is not authentication and must not be represented as production account or payment security.

**Input**: User description: "Add login, name and optional photo onboarding, a photo-informed ‘This you?’ calibration with five swipeable categories, payment-method setup, and an AI-assisted Buy Now flow that prepares the purchase but always asks for confirmation before Apple Pay, Google Pay, PayPal, Affirm, or another eligible method completes it."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sign In and Create a Personal Profile (Priority: P1)

As a shopper, I want to sign in and provide my name and, optionally, a photo so that my preferences and purchases belong to me and HAPA can make the experience feel personal.

**Why this priority**: Identity is the prerequisite for persistent personalization, private photo handling, payment readiness, and order history.

**Independent Test**: Sign in with a valid account, enter a name, upload or skip a photo, leave the app, and verify that the same profile resumes after signing in again.

**Acceptance Scenarios**:

1. **Given** a signed-out shopper, **When** they open HAPA, **Then** they must authenticate before entering personalized onboarding or the shopping feed.
2. **Given** an authenticated shopper without a completed profile, **When** they continue, **Then** HAPA asks for a display name and clearly labels photo upload as optional.
3. **Given** a shopper who selects a supported photo, **When** the file passes validation, **Then** they can preview, replace, or remove it before continuing.
4. **Given** a shopper who does not upload a photo, **When** they continue, **Then** onboarding proceeds with generic calibration choices and no degraded-state warning.
5. **Given** a returning authenticated shopper, **When** their profile is complete, **Then** HAPA restores their profile and resumes the feed without repeating onboarding.
6. **Given** a signed-in shopper, **When** they choose to sign out, **Then** private profile, photo, payment-readiness, and order information are no longer visible in that browser session.

---

### User Story 2 - Confirm “This You?” Style Signals (Priority: P1)

As a new shopper, I want to react to five category or style suggestions so that HAPA learns what fits me before I start browsing.

**Why this priority**: The five-choice calibration turns photo analysis or generic defaults into explicit shopper-approved preferences instead of silently assuming taste.

**Independent Test**: Complete profile setup once with a photo and once without one, then verify that each path produces exactly five swipeable suggestions and a usable style profile.

**Acceptance Scenarios**:

1. **Given** a valid uploaded photo with a shopping-relevant filename, **When** prototype matching completes, **Then** the “This you?” page shows exactly five category or style suggestions derived from normalized filename keywords; a filename containing “jean” or “denim” produces five jeans-only suggestions with relevant imagery.
2. **Given** multiple photos whose filenames match different supported concepts, **When** suggestions are built, **Then** HAPA interleaves the concept-specific cards so every matched concept appears before one repeats; jeans plus shirts produces a three-card/two-card mix.
3. **Given** no uploaded photo, **When** the “This you?” page opens, **Then** it shows exactly five varied generic shopping categories.
4. **Given** a visible suggestion, **When** the shopper swipes right or selects the positive action, **Then** its category and positive attributes are added to the shopper's style profile.
5. **Given** a visible suggestion, **When** the shopper swipes left or selects the negative action, **Then** its strongest attributes become exclusions and its category is not added.
6. **Given** a shopper who uses keyboard or visible buttons, **When** they accept or reject a suggestion, **Then** the result is identical to the corresponding swipe.
7. **Given** all five suggestions have been reviewed, **When** the final choice is recorded, **Then** HAPA shows a concise style summary and advances to payment-method readiness.
8. **Given** a shopper views filename-derived suggestions, **When** they inspect the page, **Then** HAPA explains that the prototype uses shopping keywords rather than identity or sensitive-trait analysis.

---

### User Story 3 - Review Payment-Method Readiness (Priority: P1)

As a shopper, I want to see which payment options can be used or still need setup so that Buy Now can move quickly without pretending an unavailable method is ready.

**Why this priority**: Agent-assisted checkout cannot deliver its core promise unless the shopper understands which payment methods are genuinely eligible.

**Independent Test**: Open payment setup on multiple devices and order contexts and verify that Apple Pay, Google Pay, PayPal, Affirm, and other methods display truthful availability and setup states.

**Acceptance Scenarios**:

1. **Given** a shopper has completed style calibration, **When** the billing page opens, **Then** it lists Apple Pay, Google Pay, PayPal, Affirm, and any other supported methods with an Available, Setup required, or Unavailable status.
2. **Given** a method is unsupported for the shopper's device, browser, region, currency, merchant, or expected order, **When** it is listed, **Then** HAPA does not represent it as ready and provides a short reason where one is known.
3. **Given** a method needs an external account connection or provider setup, **When** the shopper selects it, **Then** HAPA uses that provider's authorization experience rather than requesting raw payment credentials.
4. **Given** multiple methods are available, **When** the shopper chooses a preferred method, **Then** HAPA saves only the preference and safe provider reference needed to offer it later.
5. **Given** no method is ready, **When** the shopper continues, **Then** they may choose Set up later and enter the shopping feed; checkout will require a method before payment.
6. **Given** billing review is complete or deferred, **When** the shopper continues, **Then** HAPA takes them directly to the swipeable shopping feed.

---

### User Story 4 - Browse a Continuous Personalized Feed (Priority: P1)

As a shopper, I want to move through a full-screen stream of relevant products so that discovery feels immediate and uninterrupted.

**Why this priority**: The feed is HAPA's primary surface and the place where profile and photo-informed style signals become useful.

**Independent Test**: Complete onboarding, browse beyond the initial result set, and verify that relevant product slides continue to appear without an empty state.

**Acceptance Scenarios**:

1. **Given** a shopper with a completed style profile, **When** the feed opens, **Then** the first product set reflects accepted categories, weighted preferences, exclusions, context, and price ceiling.
2. **Given** a product slide, **When** it is visible, **Then** the shopper can identify the product, merchant, price, imagery, and available rating or delivery information.
3. **Given** the shopper approaches the end of loaded products, **When** they continue swiping, **Then** more eligible products appear without an explicit pagination action.
4. **Given** live product discovery is unavailable or insufficient, **When** the feed requests products, **Then** a curated, profile-relevant set is shown instead of an empty or fatal error state.
5. **Given** a product matches a hard exclusion, **When** results are ranked, **Then** that product is omitted regardless of its other matching attributes.

---

### User Story 5 - Buy With Agent Assistance and Explicit Confirmation (Priority: P1)

As a shopper, I want the AI agent to prepare the product, options, shipping, and payment flow so that I only need to review and authorize the final purchase.

**Why this priority**: This transforms Buy Now from a merchant link into HAPA's main commerce value while preserving shopper control over spending.

**Independent Test**: Select an eligible product, let the agent prepare checkout, verify the full review, authorize with an available payment method, and confirm that exactly one order is created.

**Acceptance Scenarios**:

1. **Given** a product supports HAPA checkout, **When** the shopper selects Buy Now, **Then** the agent verifies current product availability, price, merchant, and required options before presenting a purchase review.
2. **Given** a required option such as size, color, quantity, or shipping address is missing or ambiguous, **When** checkout is prepared, **Then** the agent asks the shopper to resolve it instead of guessing.
3. **Given** checkout preparation succeeds, **When** the review appears, **Then** it shows the exact product, variant, merchant, quantity, subtotal, discounts, shipping, tax, total, delivery destination, and proposed payment method.
4. **Given** the review is visible, **When** the shopper has not explicitly confirmed it, **Then** no order is placed and no payment is submitted.
5. **Given** the shopper confirms the review, **When** Apple Pay or Google Pay is selected, **Then** the appropriate wallet sheet opens and requires the wallet's own user authorization before payment is submitted.
6. **Given** the shopper confirms the review, **When** PayPal, Affirm, or another redirect-based method is selected, **Then** the shopper completes that provider's authentication or financing approval before returning to HAPA.
7. **Given** payment succeeds, **When** HAPA receives a verified result, **Then** it shows one order confirmation with merchant, total, payment method, and receipt or order reference.
8. **Given** payment is canceled, declined, delayed, or unknown, **When** HAPA receives or times out waiting for the result, **Then** it shows the real state and offers a safe retry without creating a duplicate order.
9. **Given** a product does not support HAPA checkout, **When** the shopper selects Buy Now, **Then** HAPA clearly labels the limitation and opens the external merchant checkout without claiming the agent will complete it.

---

### User Story 6 - Redirect the Feed by Voice (Priority: P2)

As a shopper, I want to describe a new activity, mood, category, or constraint aloud so that the feed immediately follows my new direction while retaining relevant parts of my style.

**Why this priority**: Voice steering remains HAPA's defining discovery interaction, after authenticated onboarding and safe checkout are established.

**Independent Test**: Begin on one shopping theme, speak a materially different request with an exclusion, and verify that the feed resets to products matching the new theme and omitting the rejected attribute.

**Acceptance Scenarios**:

1. **Given** an active feed, **When** the shopper explicitly starts voice interaction, **Then** HAPA requests microphone access and communicates whether it is connecting, listening, or responding.
2. **Given** HAPA is listening, **When** the shopper names a new activity or direction, **Then** HAPA derives concrete product categories and relevant visual or material attributes.
3. **Given** the shopper states something they do not want, **When** the request is interpreted, **Then** the stated attribute becomes an exclusion and matching products are omitted.
4. **Given** a valid new direction, **When** it is applied, **Then** the existing feed is replaced, returns to its starting position, and visibly reflects the direction within 3 seconds after the shopper finishes speaking.
5. **Given** the new request changes the shopping category, **When** the profile is updated, **Then** the new category replaces the former category while still-applicable style preferences remain.
6. **Given** the request is applied, **When** the feed changes, **Then** the shopper receives a short confirmation summarizing what was added and removed.

---

### User Story 7 - Recover Safely on Unreliable Connectivity (Priority: P2)

As a shopper or presenter, I want non-financial dependencies to degrade gracefully and financial operations to fail safely so that the experience remains useful without falsifying identity or payment outcomes.

**Why this priority**: HAPA is intended for a live demonstration, but reliability cannot come at the cost of fake authentication, duplicate purchases, or false payment success.

**Independent Test**: Disable photo analysis, product discovery, voice, request interpretation, authentication, and payment callbacks one at a time and verify the documented safe outcome for each.

**Acceptance Scenarios**:

1. **Given** photo analysis fails or times out, **When** onboarding continues, **Then** HAPA uses generic “This you?” suggestions without blocking profile setup.
2. **Given** product discovery fails or returns too few usable products, **When** the feed loads, **Then** HAPA uses curated products and continues browsing.
3. **Given** enhanced direction interpretation is unavailable, **When** a new direction is submitted, **Then** HAPA derives a usable direction with deterministic keyword and exclusion rules.
4. **Given** voice is unavailable or microphone access is denied, **When** the shopper wants to redirect the feed, **Then** a text control triggers the same profile and feed behavior.
5. **Given** authentication cannot be verified, **When** protected data or checkout is requested, **Then** HAPA requires reauthentication and does not expose or alter the shopper's private state.
6. **Given** payment or order status cannot be verified, **When** checkout is interrupted, **Then** HAPA shows pending or unknown status, preserves the idempotent checkout reference, and does not retry automatically.

---

### User Story 8 - Present HAPA as a Focused Mobile Experience (Priority: P3)

As a shopper, I want HAPA to run edge-to-edge from my phone's Home Screen so that it feels like a purpose-built shopping product.

**Why this priority**: The presentation shell improves clarity and polish but does not block the core authenticated shopping journey.

**Independent Test**: Add HAPA to a supported phone's Home Screen, launch it, and verify full-screen presentation and unobstructed controls around device safe areas.

**Acceptance Scenarios**:

1. **Given** HAPA has been added to a supported phone's Home Screen, **When** it is launched, **Then** it opens in a standalone, full-screen presentation.
2. **Given** a phone with display cutouts or a home indicator, **When** bottom-anchored controls render, **Then** all controls remain visible and operable within safe areas.
3. **Given** a returning authenticated shopper, **When** HAPA opens, **Then** it restores their onboarding state, style profile, preferred payment method, and recent order status.

### Edge Cases

- An uploaded file has an unsupported type, exceeds the size limit, is corrupted, or contains no useful style cues; the shopper can replace it or continue with generic suggestions.
- The photo contains multiple people or a background with many objects; HAPA describes only broad shopping-relevant signals and asks the shopper to confirm them through the five suggestions.
- The shopper deletes or replaces a photo after onboarding; the original and derived unconfirmed suggestions are removed, while explicitly accepted preferences remain until the shopper resets them.
- A photo-analysis result attempts to include identity, age, race, ethnicity, health, religion, sexuality, or another sensitive trait; that output is rejected and generic suggestions are used.
- A session expires during onboarding or checkout; progress is preserved where safe, but private data and payment actions remain blocked until reauthentication.
- A payment method appears available during onboarding but is ineligible for a later order because of device, browser, merchant, country, currency, or amount; checkout explains the change and offers currently eligible alternatives.
- The price, tax, shipping cost, inventory, or selected variant changes between the feed and confirmation; the review updates and requires a new explicit confirmation.
- The shopper taps Confirm more than once, reloads, navigates back, or receives a delayed callback; the same checkout cannot create more than one order or charge.
- A payment succeeds but the client disconnects before showing confirmation; HAPA reconciles from verified provider or merchant status instead of asking the shopper to pay again.
- A payment is authorized but order creation fails; HAPA shows a resolving state and follows the supported void, refund, or support path without claiming success.
- A positive attribute is later named as an exclusion; the exclusion wins and the positive attribute is removed.
- Duplicate, differently cased, or repeated preferences and exclusions are normalized.
- A product result lacks a title, image, destination, or current offer information; it is excluded or restricted to external handoff rather than shown as agent-checkout eligible.
- A late voice interpretation arrives after a deterministic fallback was applied; it does not cause a second feed reset.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: HAPA MUST require an authenticated shopper session before showing private profile data, personalized feed state, billing readiness, checkout, or order history.
- **FR-002**: HAPA MUST support secure sign-in, returning-session restoration, reauthentication, and sign-out without exposing another shopper's data.
- **FR-003**: Profile setup MUST require a display name and present photo upload as optional.
- **FR-004**: Photo upload MUST support preview, replacement, removal, file validation, and a clear explanation of how the photo affects recommendations.
- **FR-005**: In Prototype Mode, photo matching MUST inspect only normalized filename keywords and MUST NOT inspect image pixels, identify people, perform face recognition, create biometric templates, or infer protected or sensitive traits.
- **FR-006**: HAPA MUST allow a shopper to delete a stored photo and its derived, unconfirmed analysis data.
- **FR-007**: HAPA MUST generate exactly five “This you?” suggestions from filename keywords or exactly five generic suggestions when no photo exists; one recognized concept fills the deck, while multiple recognized concepts are interleaved so each appears before a concept repeats. Jeans plus shirts MUST produce a 3/2 mixed deck.
- **FR-008**: Every “This you?” suggestion MUST support equivalent positive and negative actions through gestures, visible controls, and keyboard input.
- **FR-009**: Accepting a suggestion MUST add its category and positive attributes; rejecting it MUST add its strongest attributes as exclusions without adding the category.
- **FR-010**: HAPA MUST store explicit shopper choices separately from machine-generated suggestions so generated signals never silently become confirmed preferences.
- **FR-011**: HAPA MUST maintain an account-backed style profile containing weighted positive attributes, hard exclusions, active categories, optional context, optional price ceiling, source provenance, version, and last-updated value.
- **FR-012**: Applying an exclusion MUST remove the same normalized attribute from positive preferences; positive attribute weights MUST be capped at five.
- **FR-013**: HAPA MUST let the shopper reset style preferences and repeat calibration without deleting their account or order history.
- **FR-014**: The billing page MUST list Apple Pay, Google Pay, PayPal, Affirm, and other supported methods with truthful Available, Setup required, or Unavailable status.
- **FR-015**: Payment-method status MUST account for device, browser, shopper country, currency, merchant, order amount, and provider eligibility when that context is available.
- **FR-016**: HAPA MUST NOT collect or store raw card numbers, security codes, wallet credentials, or online-banking credentials.
- **FR-017**: HAPA MUST let the shopper save a preferred method using only safe provider references and MUST allow payment setup to be deferred until checkout.
- **FR-018**: Completing or deferring payment setup MUST take the shopper directly to the personalized, swipeable product feed.
- **FR-019**: The feed MUST rank and filter products using confirmed categories, positive attributes, exclusions, context, and price ceiling.
- **FR-020**: The feed MUST omit products matching any hard exclusion and MUST not replace a non-empty feed with an empty feed after a failed refresh.
- **FR-021**: The feed MUST present full-screen, vertically browsable products and load more eligible products as the shopper approaches the end.
- **FR-022**: Each product MUST clearly indicate whether HAPA checkout is supported or Buy Now will hand off to the external merchant.
- **FR-023**: For HAPA-checkout products, Buy Now MUST start an agent-assisted checkout that verifies the current offer and resolves all required product and delivery options.
- **FR-024**: The agent MUST ask the shopper about missing or ambiguous variant, quantity, shipping, or contact information and MUST NOT guess information that affects the order.
- **FR-025**: Before order or payment submission, HAPA MUST show the exact product, variant, merchant, quantity, subtotal, discount, shipping, tax, total, delivery destination, and payment method.
- **FR-026**: HAPA MUST require a new explicit shopper confirmation whenever any reviewed purchase detail or total changes.
- **FR-027**: After HAPA confirmation, the selected payment provider MUST complete its own required authentication or authorization before payment is submitted.
- **FR-028**: HAPA MUST NOT support unattended, background, scheduled, or blanket-authorized purchasing.
- **FR-029**: Order and payment creation MUST be idempotent so repeated input, retries, reloads, and delayed callbacks cannot create duplicate charges or orders.
- **FR-030**: HAPA MUST derive final payment and order state from verified provider or merchant results, not from client navigation or elapsed time.
- **FR-031**: A successful purchase MUST produce an order confirmation and persistent order record; canceled, declined, pending, failed, and unknown results MUST remain distinguishable.
- **FR-032**: Products without a supported checkout contract MUST use a clearly labeled external-merchant handoff and MUST NOT be represented as agent-completed purchases.
- **FR-033**: HAPA MUST provide shopper-visible recovery for payment succeeded/order failed, order created/payment pending, delayed callback, and client-disconnect scenarios.
- **FR-034**: HAPA MUST support shopper-initiated voice direction changes and an equivalent text fallback.
- **FR-035**: A valid direction change MUST update the style profile, replace active categories, reset the feed once, and show a concise change summary.
- **FR-036**: Photo analysis, product discovery, voice, and enhanced request interpretation MUST have usable non-financial fallbacks; authentication and payments MUST fail closed.
- **FR-037**: HAPA MUST preserve visible feed content during recoverable errors and show concise, non-blocking notices.
- **FR-038**: HAPA MUST support standalone Home Screen presentation, safe-area-aware controls, meaningful alternative text, and operable primary controls without swipe precision.

### Scope Boundaries

- Agent-assisted checkout is limited to products whose seller or catalog integration allows HAPA to retrieve a current offer and create an order. Arbitrary external merchant websites are not automated.
- HAPA never purchases without an order-specific review, shopper confirmation, and payment-provider authorization.
- Payment methods are eligibility-dependent; listing Apple Pay, Google Pay, PayPal, or Affirm does not guarantee availability for every shopper or order.
- HAPA stores safe provider references and order records, not raw payment credentials.
- Photo analysis supports recommendation signals only; identification, biometric processing, sensitive-trait inference, and identity verification from photos are outside scope.
- HAPA does not guarantee external merchant inventory, delivery performance, return policy, or checkout reliability.
- Push notifications, background purchasing, price-triggered automatic buying, and offline payment submission are outside this feature.

### Key Entities

- **Shopper Account**: The authenticated identity that owns profile, onboarding, billing-readiness, style, and order records.
- **Shopper Profile**: Display name, optional private photo reference, onboarding status, preferences, and deletion timestamps.
- **Prototype Filename Match**: Normalized, allow-listed shopping keywords derived from the local image filename, with source provenance; never pixel, identity, or biometric analysis.
- **Style Suggestion**: One of five photo-derived or generic categories with positive attributes, rejection attributes, source, and shopper decision.
- **Style Profile**: Confirmed weighted affinities, exclusions, active categories, context, price ceiling, provenance, version, and update time.
- **Payment Method Readiness**: A method name, safe provider reference, preference state, eligibility status, reason, and last verification time.
- **Product**: A normalized feed item including stable identity, merchant, current-offer reference, image, destination, price data, variants, checkout capability, and searchable tags.
- **Checkout Session**: A short-lived, shopper-owned preparation containing selected offer, resolved options, shipping, totals, eligible methods, confirmation version, idempotency key, and status.
- **Order Confirmation**: The immutable reviewed snapshot approved by the shopper before payment submission.
- **Order**: The persistent result containing merchant reference, checkout and payment references, items, totals, fulfillment details, status, receipt, and timestamps.
- **Direction Change**: A profile update derived from voice or text, including preferences, exclusions, replacement categories, context, and confirmation label.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 90% of test shoppers can sign in, enter a name, upload or skip a photo, complete five “This you?” decisions, review payment readiness, and reach the feed without assistance.
- **SC-002**: Uploaded image filenames produce five shopping-relevant suggestions within 0.2 seconds; jeans-only input produces five denim cards, jeans-plus-shirts input produces a 3/2 mixed deck, and the no-photo path immediately uses the generic set.
- **SC-003**: 100% of tested photo outputs contain no identity claim, biometric template, or protected or sensitive trait.
- **SC-004**: Payment setup displays no method as Available when the relevant device, provider, merchant, region, currency, or order eligibility check says it is unavailable.
- **SC-005**: At least 95% of live product requests show 12 usable products within 2.5 seconds; fallback requests do so within 0.15 seconds under intended demo conditions.
- **SC-006**: A completed spoken direction produces a visible, materially different feed within 3 seconds.
- **SC-007**: For supported products, at least 90% of test shoppers can reach a complete purchase review in under 20 seconds after selecting Buy Now when required options are already known.
- **SC-008**: In 100% of checkout tests, no order or payment submission occurs before the exact total is shown and the shopper explicitly confirms it.
- **SC-009**: In 100% of Apple Pay and Google Pay tests, the wallet's user authorization step remains present and cannot be bypassed by the agent.
- **SC-010**: Repeated confirmation taps, reloads, callback replays, and safe retries create zero duplicate charges and zero duplicate orders across the test suite.
- **SC-011**: Every purchase test ends in one distinguishable state—confirmed, canceled, declined, pending, failed, or unknown—and only verified successful outcomes are labeled confirmed.
- **SC-012**: Products matching explicit shopper exclusions appear in 0% of validated feed results.
- **SC-013**: Disabling each non-financial dependency independently still yields a usable generic calibration, curated feed, or text steering path; disabling authentication or payment never creates a false success.
- **SC-014**: All primary onboarding, calibration, feed, voice, billing, checkout, and cancellation actions are operable without relying on swipe precision alone.
- **SC-015**: On supported mobile devices, 100% of bottom-anchored actions remain visible and operable when launched from the Home Screen.

## Assumptions

- “Apply Pay” in the request means Apple Pay.
- The initial release uses standard account authentication and secure persistent sessions; the exact sign-in providers are selected during technical planning.
- A profile photo may also serve as the shopper's avatar, but it remains private by default and is never used for identity verification.
- Photo-derived suggestions are proposals only; the shopper's five explicit decisions determine confirmed style preferences.
- The billing page reports readiness and initiates provider setup where supported; it does not itself create wallet accounts, financing approval, or universal method availability.
- Agent-assisted checkout is available only for HAPA-supported sellers or catalog offers. Other Buy Now actions use an explicit external checkout handoff.
- The shopper always approves an order-specific review and then completes any additional wallet, PayPal, Affirm, bank, or card-provider authentication.
- Apple Pay and Google Pay provide tokenized payment information only after their user-facing sheet is authorized; HAPA does not receive reusable wallet credentials.
- PayPal, Affirm, and other payment methods may depend on business location, shopper location, currency, amount, merchant category, and provider approval.
- The application may cache non-sensitive presentation preferences on the device, but the authenticated account is authoritative for profile and order data.
- Live product, photo-analysis, and enhanced-language services may be configured, but generic calibration, curated feed, and deterministic direction fallbacks remain required.
- Prototype photo personalization is intentionally simulated from allow-listed filename keywords; no image inference or model download is performed.
- The target device supports modern mobile web capabilities, microphone access, Home Screen installation, and safe-area reporting.
