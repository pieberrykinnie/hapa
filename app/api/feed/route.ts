import { FALLBACK_FEED } from "@/lib/fallback-feed";
import { fetchLiveResults } from "@/lib/serpapi";
import type { FeedResponse, Product } from "@/lib/types";

const PAGE_SIZE = 12;
// Bounds the `seen` list echoed back by the client each request — plenty to
// prevent near-term repeats without letting the query string grow forever.
const MAX_SEEN = 120;

// GET /api/feed?keywords=camping,waterproof&exclude=neon,desk&cursor=0&seen=id1,id2
//
// Live discovery first: ask SerpApi's Google Shopping engine, rotating to a
// broader or adjacent query (lib/serpapi.ts's fetchLiveResults) once the
// shopper's exact query runs dry, so the feed keeps finding genuinely new
// live products instead of settling for the curated catalogue the moment
// one narrow query is exhausted. Every real result it returns gets used —
// a thin batch is topped up with the curated catalogue rather than thrown
// away, so a page with only 1-3 live items still shows those 1-3 real
// products instead of reverting to an all-fallback page. A total failure —
// no key, timeout, malformed response, zero usable items — is just the
// zero-item case of the same blend, and the demo survives dead WiFi.
//
// `seen` is what actually keeps the "infinite" feed from repeating itself:
// a narrow query's live results don't reliably change with SerpApi's `start`
// offset, and the curated catalogue is small enough to cycle through in a
// couple of pages. Both paths exclude whatever the client has already shown
// and only wrap back to the top once every eligible item has been seen.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keywords = parseList(searchParams.get("keywords"));
  const exclude = parseList(searchParams.get("exclude"));
  const cursor = Number(searchParams.get("cursor") ?? 0) || 0;
  const seen = new Set(parseList(searchParams.get("seen")).slice(-MAX_SEEN));

  const live = await fetchLiveResults(keywords, exclude, seen, cursor, PAGE_SIZE);

  const items =
    live.length >= PAGE_SIZE
      ? live.slice(0, PAGE_SIZE)
      : blendWithFallback(live, keywords, exclude, seen, cursor);

  const body: FeedResponse = { items, nextCursor: cursor + 1 };
  return Response.json(body);
}

// Tops a partial live batch up to a full page with curated items, treating
// whatever the live batch already contributed as seen so the filler doesn't
// duplicate it.
function blendWithFallback(
  live: Product[],
  keywords: string[],
  exclude: string[],
  seen: Set<string>,
  cursor: number,
): Product[] {
  if (live.length === 0) return fallbackPage(keywords, exclude, seen, cursor);

  const combinedSeen = new Set(seen);
  live.forEach((item) => combinedSeen.add(item.id));
  const filler = fallbackPage(keywords, exclude, combinedSeen, cursor).slice(
    0,
    PAGE_SIZE - live.length,
  );
  return [...live, ...filler];
}

function parseList(value: string | null): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

// "Infinite" feed: loop the catalogue past the end so scrolling never stops.
// Already-seen items are excluded first, so a full lap through the eligible
// set happens before anything repeats.
function fallbackPage(
  keywords: string[],
  exclude: string[],
  seen: Set<string>,
  cursor: number,
): Product[] {
  const ranked = rankFallback(keywords, exclude, seen);
  if (ranked.length === 0) return [];

  // Never pad a short pool out with duplicates within the same page — a
  // small unseen remainder just returns a smaller page instead.
  const count = Math.min(PAGE_SIZE, ranked.length);
  const start = (cursor * PAGE_SIZE) % ranked.length;
  const items: Product[] = [];
  for (let i = 0; i < count; i++) {
    items.push(ranked[(start + i) % ranked.length]);
  }
  return items;
}

function rankFallback(
  keywords: string[],
  exclude: string[],
  seen: Set<string>,
): Product[] {
  // Hard exclusions always win, live or fallback — SC-012.
  const eligible = FALLBACK_FEED.filter(
    (item) => !item.tags.some((tag) => exclude.includes(tag)),
  );

  // Prefer unseen items; once every eligible item has already been shown,
  // start a new lap rather than returning nothing. Shuffled, not the raw
  // catalogue order — otherwise every lap replays in the exact same
  // score-sorted sequence, which just moves the "same items again" problem
  // a few pages later instead of solving it.
  const unseen = eligible.filter((item) => !seen.has(item.id));
  const pool = unseen.length > 0 ? unseen : shuffle(eligible);

  const matched = pool
    .map((item) => ({
      item,
      score: item.tags.filter((tag) => keywords.includes(tag)).length,
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);

  // A keyword that matches nothing (an obscure voice request, a stale chip)
  // must never blank the feed — fall back to the full exclusion-safe
  // catalogue instead of an empty page. See §2 rule 5 / FR-020.
  if (keywords.length > 0 && matched.length > 0) return matched;
  return pool;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
