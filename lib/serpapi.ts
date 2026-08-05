import { FALLBACK_FEED } from "./fallback-feed";
import type { Product } from "./types";

// Live product discovery via SerpApi's Google Shopping engine. Every caller
// path treats this as best-effort: a missing key, timeout, malformed
// response, or empty result set all resolve to an empty array so the feed
// route can fall back to the curated catalogue without the shopper ever
// seeing a gap.

const SERPAPI_URL = "https://serpapi.com/search.json";
const TIMEOUT_MS = 6000;
const MAX_QUERY_LENGTH = 120;
// A single query's live inventory is finite — SerpApi's `start` offset
// doesn't reliably page deeper into it (see fetchLiveResults below). Once a
// query stops producing a healthy batch, rotate to the next query variant
// instead of just returning less. Capped so one feed request can't chain
// into a long, slow run of SerpApi calls.
const MIN_BATCH_BEFORE_ROTATE = 4;
const MAX_QUERY_ATTEMPTS = 3;

interface SerpApiShoppingResult {
  title?: string;
  product_link?: string;
  link?: string;
  thumbnail?: string;
  price?: string;
  extracted_price?: number;
  source?: string;
  rating?: number;
  reviews?: number;
  delivery?: string;
  snippet?: string;
  extensions?: string[];
  // Opaque key for the separate google_immersive_product lookup that
  // returns this item's full photo set. The google_product engine (which
  // took a stable product_id) was deprecated by Google, so this ephemeral
  // token — regenerated on every search — is the only working path to more
  // than the one search-result thumbnail. Confirmed against the live API:
  // a single tent listing's thumbnail expands to 10 real photos through it.
  immersive_product_page_token?: string;
}

interface SerpApiShoppingResponse {
  shopping_results?: SerpApiShoppingResult[];
  error?: string;
}

interface SerpApiImmersiveProductResponse {
  product_results?: { thumbnails?: string[] };
  error?: string;
}

/**
 * Active voice/text/photo steering now replaces `dna.likes`; taking the last
 * N still caps combined requests such as "camping, rain, waterproof" and
 * preserves their most recently stated order.
 */
function mostRecent(keywords: string[], n: number): string[] {
  return keywords.slice(-n).reverse();
}

/**
 * Builds a Google Shopping query from a set of keywords. Positive keywords
 * lead; dealbreakers are appended as `-term` exclusions so SerpApi itself
 * filters obvious mismatches before they ever reach the client.
 */
function buildQuery(keywords: string[], exclude: string[]): string {
  const positive = mostRecent(keywords, 3).join(" ");
  const negative = exclude.map((term) => `-${term}`).join(" ");
  const query = [positive, negative].filter(Boolean).join(" ").trim();
  return query.slice(0, MAX_QUERY_LENGTH);
}

/**
 * Builds an ordered list of query strings to try, from most personalized to
 * broadest — the rotation `fetchLiveResults` walks through once a query
 * runs dry:
 *
 * 1. The shopper's combined top signals (current behaviour) — narrowest,
 *    most personalized, but a multi-term AND-query has the thinnest
 *    inventory.
 * 2. Each liked keyword on its own — same explicit taste, wider net.
 * 3. Tags that co-occur with the shopper's liked tags in the curated
 *    catalogue — adjacent taste. This app's StyleDNA (lib/types.ts) is a
 *    flat likes/dealbreakers list, not the weighted affinities + context
 *    SPEC.md §4/§9.1 describe, so there's no learned affinity signal to
 *    query with; the catalogue's own tag co-occurrence is the closest
 *    stand-in for "what a shopper with this taste might also want" until
 *    that richer model exists.
 */
function buildQueryVariants(keywords: string[], exclude: string[]): string[] {
  const variants: string[] = [];
  const add = (kws: string[]) => {
    const q = buildQuery(kws, exclude);
    if (q && !variants.includes(q)) variants.push(q);
  };

  add(keywords);
  mostRecent(keywords, 3).forEach((keyword) => add([keyword]));
  relatedTags(keywords, exclude).forEach((tag) => add([tag]));

  return variants;
}

/**
 * Tags that appear alongside the shopper's liked tags on the same curated
 * item, ranked by how often they co-occur. With no likes yet, this falls
 * back to the catalogue's overall most common tags — a generic "trending"
 * signal rather than a personalized one.
 */
function relatedTags(keywords: string[], exclude: string[]): string[] {
  const keywordSet = new Set(keywords);
  const excludeSet = new Set(exclude);
  const counts = new Map<string, number>();

  for (const item of FALLBACK_FEED) {
    if (keywordSet.size > 0 && !item.tags.some((tag) => keywordSet.has(tag))) {
      continue;
    }
    for (const tag of item.tags) {
      if (keywordSet.has(tag) || excludeSet.has(tag)) continue;
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([tag]) => tag);
}

/**
 * Fetches a page of live products, rotating through `buildQueryVariants`
 * when the primary query's batch is thin instead of just returning less.
 * This is what lets the feed keep surfacing genuinely new live products once
 * the primary query's inventory is exhausted, rather than settling for the
 * curated catalogue every time.
 *
 * The primary query goes first and alone — most requests get a healthy
 * batch from it and stop right there. Only when that batch is thin do the
 * remaining variants fire, and they fire together (`Promise.all`, not one
 * at a time): rotating through `MAX_QUERY_ATTEMPTS` sequentially meant a
 * single request could chain up to three full SerpApi round trips end to
 * end, which measured out to several seconds per page load — too slow for
 * a scrolling feed. Two rounds (primary, then everything else at once)
 * keeps the worst case to roughly two round trips instead of three.
 */
export async function fetchLiveResults(
  keywords: string[],
  exclude: string[],
  seen: Set<string>,
  cursor: number,
  pageSize: number,
): Promise<Product[]> {
  const variants = buildQueryVariants(keywords, exclude).slice(0, MAX_QUERY_ATTEMPTS);
  if (variants.length === 0) return [];

  const combinedSeen = new Set(seen);
  const collected: Product[] = [];
  const start = cursor * pageSize;

  const absorb = (batch: Product[]) => {
    for (const item of batch) {
      if (collected.length >= pageSize || combinedSeen.has(item.id)) continue;
      combinedSeen.add(item.id);
      collected.push(item);
    }
  };

  const [primary, ...rest] = variants;
  absorb(await fetchLiveProducts(primary, exclude, combinedSeen, start));

  const stillThin = collected.length < MIN_BATCH_BEFORE_ROTATE && collected.length < pageSize;
  if (stillThin && rest.length > 0) {
    const batches = await Promise.all(
      rest.map((variant) => fetchLiveProducts(variant, exclude, combinedSeen, start)),
    );
    batches.forEach(absorb);
  }

  return collected;
}

/**
 * Fetches one page of live products for a single query. Never throws and
 * never returns fewer items than actually exist — every caller failure mode
 * (no key, forced fallback, network/timeout error, malformed response, zero
 * usable items) resolves to an empty array, and the caller decides how to
 * fill the rest of the page. Discarding a real result here because the
 * batch was "too small" would waste genuine live products for no reason.
 *
 * `start` is passed through to SerpApi's own offset, but that alone isn't
 * reliable pagination: a narrow demo query often has the same handful of
 * matches regardless of offset. `seen` is the actual authority — it's what
 * keeps a shopper from being served the same live item twice in one session.
 */
async function fetchLiveProducts(
  query: string,
  exclude: string[],
  seen: Set<string>,
  start: number,
): Promise<Product[]> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey || process.env.FORCE_FALLBACK === "1" || !query) return [];

  const params = new URLSearchParams({
    engine: "google_shopping",
    q: query,
    api_key: apiKey,
    gl: "ca",
    hl: "en",
    start: String(start),
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${SERPAPI_URL}?${params}`, {
      signal: controller.signal,
      // Every shopper's feed is personalized — never let this hit a shared cache.
      cache: "no-store",
    });
    if (!res.ok) return [];

    const data = (await res.json()) as SerpApiShoppingResponse;
    if (data.error) return [];

    return normalize(data.shopping_results ?? [], query, exclude, seen);
  } catch {
    return []; // timeout, network error, or malformed JSON
  } finally {
    clearTimeout(timeout);
  }
}

function normalize(
  results: SerpApiShoppingResult[],
  query: string,
  exclude: string[],
  seen: Set<string>,
): Product[] {
  const excludeLower = exclude.map((term) => term.toLowerCase());
  const tags = query
    .split(" ")
    .filter((term) => !term.startsWith("-"))
    .map((term) => term.toLowerCase())
    .filter(Boolean);

  return results
    .map((result) => toProduct(result, tags))
    .filter((product): product is Product => product !== null)
    .filter((product) => !matchesExclusion(product, excludeLower))
    .filter((product) => !seen.has(product.id));
}

function toProduct(result: SerpApiShoppingResult, tags: string[]): Product | null {
  const link = result.product_link || result.link;
  if (!result.title || !result.thumbnail || !link) return null; // FR-020: no dead/incomplete cards

  const price = result.extracted_price ?? parsePrice(result.price);
  if (price === null) return null;
  const description = Array.from(
    new Set(
      [result.delivery, ...(result.extensions ?? []), result.snippet].filter(
        (value): value is string => Boolean(value?.trim()),
      ),
    ),
  ).join(" · ");

  return {
    id: `serpapi-${hashSource(link)}`,
    title: result.title,
    price,
    currency: "CAD",
    salePct: null,
    merchant: result.source ?? "Online",
    image: result.thumbnail,
    gallery: [],
    link,
    tags,
    description,
    galleryToken: result.immersive_product_page_token ?? null,
  };
}

/**
 * Fetches a live product's full photo set. Only ever called on demand, when
 * the shopper opens that specific product's detail page — never eagerly for
 * a whole feed page, since each call costs a separate SerpApi credit and
 * most scrolled-past products are never opened. Empty array on any failure
 * (no key, forced fallback, timeout, malformed response): the caller keeps
 * showing the one thumbnail it already has.
 */
export async function fetchProductGallery(pageToken: string): Promise<string[]> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey || process.env.FORCE_FALLBACK === "1" || !pageToken) return [];

  const params = new URLSearchParams({
    engine: "google_immersive_product",
    page_token: pageToken,
    api_key: apiKey,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${SERPAPI_URL}?${params}`, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return [];

    const data = (await res.json()) as SerpApiImmersiveProductResponse;
    if (data.error) return [];

    const thumbnails = data.product_results?.thumbnails;
    return Array.isArray(thumbnails) ? thumbnails.filter((url) => typeof url === "string") : [];
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

// Bilingual CA listings sometimes render an exclusion under its French name
// rather than a French accent on the same word — "RVB" (rouge-vert-bleu) for
// "RGB", for instance. Diacritic folding alone doesn't catch that; this
// small synonym table does.
const EXCLUSION_SYNONYMS: Record<string, string[]> = {
  rgb: ["rvb"],
};

function matchesExclusion(product: Product, excludeLower: string[]): boolean {
  if (excludeLower.length === 0) return false;
  const haystack = foldDiacritics(`${product.title} ${product.description}`);
  return excludeLower.some((term) =>
    [term, ...(EXCLUSION_SYNONYMS[term] ?? [])].some((variant) =>
      haystack.includes(foldDiacritics(variant)),
    ),
  );
}

// Bilingual/regional listings render the same exclusion in accented form
// ("néon" vs "neon") — fold to base characters so the match still lands.
// SC-012 requires zero exclusion violations, so this runs on both sides.
const COMBINING_MARKS = /[\u0300-\u036f]/g;

function foldDiacritics(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(COMBINING_MARKS, "");
}

function parsePrice(price?: string): number | null {
  if (!price) return null;
  const match = price.replace(/,/g, "").match(/[\d.]+/);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
}

// Stable ID: SerpApi doesn't guarantee a `product_id`, and the link is the
// one field that's both unique and present on every usable item. Hashing
// only the link (not list position) keeps an item's ID identical across
// requests, which is what lets `seen` matching actually work.
function hashSource(link: string): string {
  let hash = 0;
  for (let i = 0; i < link.length; i++) {
    hash = (hash * 31 + link.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}
