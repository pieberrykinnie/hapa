# Phase 1 Data Model: Production Hardening — Decide What's Real

**Date**: 2026-08-06 | **Plan**: [plan.md](./plan.md)

This feature retires one data shape, introduces two, and leaves the rest of `lib/types.ts`
untouched. Field-level rules are normative and cite the spec requirement they satisfy.

---

## Retired: `Order`, `PurchaseStage`, `PurchaseStep`, `PurchaseRecord`

`lib/types.ts`'s `PurchaseStage` (`"confirm" | "working" | "done" | "failed"`), `PurchaseStep`,
`Order`, and `hapa-provider.tsx`'s `PurchaseRecord` describe a simulated in-app checkout that no
longer exists after this feature (spec FR-003). They are deleted, not deprecated in place — leaving
them reachable-but-unused would recreate the audit's own `F-D02-03` finding (a dormant, divergent
implementation nobody remembers to delete).

---

## New: `ListingVisit`

Replaces `PurchaseRecord`. Records that a shopper opened a product's real listing — nothing more.

| Field | Type | Rule |
|---|---|---|
| `productId` | `string` | Matches `Product.id`. Primary key within the visit store. |
| `merchant` | `string` | Copied from `Product.merchant` at visit time, for display without re-fetching the product. |
| `listingUrl` | `string` | Copied from `Product.link` at visit time. |
| `openedAt` | `string[]` | ISO-8601 timestamps, one appended per visit, oldest first. **Never overwritten or truncated** — this is the field that satisfies spec FR-004, which the retired `PurchaseRecord`'s single-timestamp shape could not (that was the mechanism behind audit finding `F-D02-02`). |

**Storage**: `Record<string, ListingVisit>` keyed by `productId`, under a renamed `localStorage` key
(`hapa.listing-visits`, replacing `hapa.purchases`) — the rename is deliberate so a stale
`hapa.purchases` blob from a browser that ran the old build is never misread as a `ListingVisit`
record.

**Validation**
- `openedAt.push(new Date().toISOString())` on every visit; the array is append-only.
- No field carries any claim of payment, order, or receipt status (spec FR-002). The type has no
  field for one — the same structural-enforcement pattern `002`'s finding schema used for
  Principle VII.

**UI consequence**: "Buy now" reads as "Buy now" on first visit and something like "View listing
again" once `ListingVisit` exists for that product (spec Acceptance Scenario US1.2) — a presentation
decision made from `openedAt.length > 0`, not a new field.

---

## New: Vibe Photo Analysis (produces the existing `VibeShift` type)

No new wire type is needed — the Groq call's validated output is a `VibeShift`
(`add_keywords: string[]; remove_keywords: string[]; dealbreakers: string[]`), the type
`applyVibeShift` already accepts from every other steering path (voice, typed text). "Vibe Photo
Analysis" (named as a Key Entity in spec.md) is the *process* that produces one from a photo, not a
new persisted shape — nothing about a submitted photo or its analysis is persisted to `localStorage`
at all; it is used once, in memory, to produce a `VibeShift`, then discarded, matching how the
existing typed-text and voice paths already work.

**Process contract** (detailed in `contracts/groq-vision-analysis.md`):

| Step | Rule | Source |
|---|---|---|
| Request | The submitted photo's bytes, sent once, to Groq's vision endpoint only — never persisted server-side by HAPA. | spec FR-006 |
| Timeout | 5 seconds, matching `SPEC.md:850`'s already-stated photo-analysis budget. | research.md R1 |
| Output validation | Rejected if it names or implies identity, a biometric signal, or a protected/sensitive trait — same rule family as `lib/onboarding/rules.ts`'s `SENSITIVE_PATTERNS`/`safeSuggestions`. | spec FR-007 |
| On timeout, error, or rejected output | Honest failure state; typed-text fallback offered. No fixed/fabricated shift substituted. | spec FR-008 |
| Consent copy | Must state the photo is sent to a server-side service — no on-device-only or never-uploaded claim for this feature specifically. | spec FR-023 |

**Validation rule enforced structurally**: the Groq response is parsed directly into `VibeShift`'s
three string-array fields. There is no field in that type capable of carrying an image, a face
descriptor, or a name — the same "nowhere to put it" enforcement `002`'s finding schema used for
Principle VII compliance.

---

## New: Operator Error Record

Sentry's own event shape (not a HAPA-defined wire type), constrained by a scrubbing contract
detailed in `contracts/operator-error-record.md`. Documented here for completeness because spec
FR-015/FR-016 impose rules on its content that implementation must enforce at the point of capture.

| Field class | Allowed | Forbidden |
|---|---|---|
| Error identity | message, stack trace, route/component name, timestamp, release/commit SHA | — |
| Request context | HTTP method, route path, response status | full request/response body |
| User/device context | none collected (no accounts exist per FR-021) | any `localStorage` content, any photo `dataUrl` or object URL, any `VibeShift`/`ListingVisit` content |
| Quota signals (FR-017) | a named event/breadcrumb when SerpApi or Vapi usage crosses an approaching-exhaustion threshold | the raw API key or credential value |

---

## Relationships

```text
Product (existing, unchanged)
 └── ListingVisit[productId]        (0 or 1 record per product, growing openedAt[] — FR-004)

VibeShift (existing, unchanged)
 └── produced by: typed-text parse (existing)
 └── produced by: voice tool-call (existing)
 └── produced by: Vibe Photo Analysis (NEW — validated Groq output, this feature)

Operator Error Record (Sentry-managed)
 └── captured from: any server-side route/handler error
 └── captured from: quota-approaching signals (SerpApi, Vapi — FR-011/FR-014/FR-017)
 └── MUST NOT reference: any photo, any ListingVisit/VibeShift content, any localStorage blob
```

**Cardinality rules**
- Exactly one `ListingVisit` record per product a shopper has ever opened; zero for products never
  opened. Never more than one record per product (keyed by `productId`), but that one record's
  `openedAt` grows unboundedly with re-visits — this is the intended fix for `F-D02-02`.
- A Vibe Photo Analysis never persists past the single `applyVibeShift` call it feeds.
