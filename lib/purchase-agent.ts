import type { BillingMethod, Product } from "./types";

/**
 * The shopping agent's narrated checkout run.
 *
 * DEMO SCOPE: this simulates the agent locally on a timer. No browser is
 * driven, no merchant site is contacted, and no money moves. When the real
 * agent lands, replace `runPurchaseAgent` with a call that streams progress
 * events — the step shape below is what the UI already renders.
 */

export function buildSteps(product: Product, billing: BillingMethod): string[] {
  return [
    `Opening ${product.merchant}`,
    "Checking price and availability",
    "Adding your item to cart",
    "Skipping optional offers",
    "Confirming delivery details",
    `Authorizing ${billing.label}`,
    "Saving your receipt",
  ];
}

/** Roughly how long each step lingers, so the narration reads rather than blurs. */
export const STEP_MS = 900;

export function makeOrderRef(): string {
  return `HAPA-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}
