import type { ListingVisit, Product } from "./types";

/** Basic guard for spec FR-005 — a well-formed, openable http(s) URL. */
export function isValidListingUrl(link: string | null | undefined): boolean {
  if (!link) return false;
  try {
    const url = new URL(link);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Appends a visit timestamp to the product's `ListingVisit` record, creating
 * it on first visit. The `openedAt` array is append-only per FR-004 — never
 * truncated or overwritten.
 */
export function recordVisit(
  current: Record<string, ListingVisit>,
  product: Product,
  now?: string,
): Record<string, ListingVisit> {
  const timestamp = now ?? new Date().toISOString();
  const existing = current[product.id];
  const next: ListingVisit = existing
    ? { ...existing, openedAt: [...existing.openedAt, timestamp] }
    : {
        productId: product.id,
        merchant: product.merchant,
        listingUrl: product.link,
        openedAt: [timestamp],
      };
  return { ...current, [product.id]: next };
}
