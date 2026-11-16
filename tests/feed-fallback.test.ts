import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/feed/route";
import { FALLBACK_FEED } from "@/lib/fallback-feed";

const PAGE_SIZE = 12;

function feedRequest(params: Record<string, string>) {
  const search = new URLSearchParams(params);
  return new Request(`http://localhost/api/feed?${search}`);
}

describe("app/api/feed/route GET — fallback path (FR-010, FR-012)", () => {
  const originalForceFallback = process.env.FORCE_FALLBACK;

  beforeEach(() => {
    process.env.FORCE_FALLBACK = "1";
  });

  afterEach(() => {
    if (originalForceFallback === undefined) delete process.env.FORCE_FALLBACK;
    else process.env.FORCE_FALLBACK = originalForceFallback;
  });

  it("returns a full page from FALLBACK_FEED when live search is unavailable", async () => {
    const res = await GET(feedRequest({ cursor: "0" }));
    const body = (await res.json()) as { items: { id: string }[]; nextCursor: number | null };

    expect(body.items).toHaveLength(PAGE_SIZE);
    const fallbackIds = new Set(FALLBACK_FEED.map((item) => item.id));
    expect(body.items.every((item) => fallbackIds.has(item.id))).toBe(true);
  });

  it("keeps serving full pages from the fallback catalogue across multiple cursors", async () => {
    const first = await GET(feedRequest({ cursor: "0" }));
    const firstBody = (await first.json()) as { items: { id: string }[] };
    const seen = firstBody.items.map((item) => item.id).join(",");

    const second = await GET(feedRequest({ cursor: "1", seen }));
    const secondBody = (await second.json()) as { items: { id: string }[] };

    expect(firstBody.items).toHaveLength(PAGE_SIZE);
    expect(secondBody.items).toHaveLength(PAGE_SIZE);
    const fallbackIds = new Set(FALLBACK_FEED.map((item) => item.id));
    expect(secondBody.items.every((item) => fallbackIds.has(item.id))).toBe(true);
  });
});
