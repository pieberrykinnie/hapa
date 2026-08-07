# Contract: Listing Visit (US1)

**Status**: Frozen for Phase 2 task breakdown, per Constitution Principle V.

Governs the replacement for the retired `Order`/`PurchaseRecord`/purchase-agent subsystem.
Full type defined in [data-model.md](../data-model.md).

## Behavior contract for "Buy now"

1. **Trigger**: shopper taps "Buy now" on a feed card, saved-item card, or the product detail page.
2. **Action**: open `product.link` in a new browser tab/window
   (`target="_blank" rel="noopener noreferrer"` or equivalent) — HAPA performs no server round trip
   of its own for this action; it is a direct navigation to the merchant's real listing.
3. **Record**: append `new Date().toISOString()` to that product's `ListingVisit.openedAt` array,
   creating the record if this is the first visit. This write happens regardless of whether the
   shopper actually completes anything on the merchant's site — HAPA has no way to know that, and
   must not claim to (spec Edge Cases).
4. **Guard (spec FR-005)**: if `product.link` is empty, malformed (fails a basic URL check), or
   absent, the "Buy now" affordance for that product either does not render, or renders
   disabled with copy stating the listing cannot currently be opened. It never silently does
   nothing on tap.

## What this replaces, precisely

| Retired | Reason |
|---|---|
| `lib/purchase-agent.ts` (`buildSteps`, `STEP_MS`, `makeOrderRef`) | The entire simulated checkout timeline this file drove no longer exists. |
| `components/purchase-flow.tsx`'s `ConfirmSheet` and `AgentRun` | Replaced by the immediate link-out in step 2 above, plus the lightweight confirmation in step 3. |
| `hapa-provider.tsx`'s `requestPurchase`/`confirmPurchase`/`cancelPurchase`/`purchases` state and `PURCHASES_STORAGE_KEY` | Replaced by a direct link-out handler and the `ListingVisit` store under a new storage key (`hapa.listing-visits`). |
| Every "Order confirmed" / "Receipt ready" / "Sent to email" / "checkout steps verified" UI string | None of these claims may exist anywhere in the shipped interface (spec FR-002) — there is nothing left in the data model capable of backing them. |

## What "Buy another" becomes

The retired flow's "Buy another" button (shown after a fabricated "Order confirmed" screen) has no
equivalent screen to attach to anymore. Re-opening a product a shopper has already visited is just
another "Buy now" tap on that same product — it appends to the same `ListingVisit.openedAt` array
(spec Acceptance Scenario US1.3) rather than requiring a distinct UI state.

## Non-goals

This contract does not attempt to detect, infer, or record whether a purchase actually happened on
the merchant's site. That is explicitly outside HAPA's knowledge and outside this feature's scope
(spec Edge Cases: "It doesn't [know], and must not claim to").
