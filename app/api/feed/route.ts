import { FALLBACK_FEED } from "@/lib/fallback-feed";
import type { FeedResponse, Product } from "@/lib/types";

const PAGE_SIZE = 6;

// GET /api/feed?keywords=camping,waterproof&exclude=neon,desk&cursor=0
//
// SerpApi Google Shopping goes here once a key is provisioned; until then the
// curated fallback catalogue serves every request so the demo survives dead WiFi.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keywords = parseList(searchParams.get("keywords"));
  const exclude = parseList(searchParams.get("exclude"));
  const cursor = Number(searchParams.get("cursor") ?? 0);

  const ranked = rankFallback(keywords, exclude);

  // "Infinite" feed: loop the catalogue past the end so scrolling never stops.
  const start = (cursor * PAGE_SIZE) % Math.max(ranked.length, 1);
  const items: Product[] = [];
  for (let i = 0; i < PAGE_SIZE && ranked.length > 0; i++) {
    items.push(ranked[(start + i) % ranked.length]);
  }

  const body: FeedResponse = { items, nextCursor: cursor + 1 };
  return Response.json(body);
}

function parseList(value: string | null): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function rankFallback(keywords: string[], exclude: string[]): Product[] {
  return FALLBACK_FEED.filter(
    (item) => !item.tags.some((tag) => exclude.includes(tag)),
  )
    .map((item) => ({
      item,
      score: item.tags.filter((tag) => keywords.includes(tag)).length,
    }))
    .filter(({ score }) => keywords.length === 0 || score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}
