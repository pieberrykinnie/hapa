import { fetchProductGallery } from "@/lib/serpapi";

// GET /api/products/gallery?token=<Product.galleryToken>
//
// One product's full photo set, fetched only when the shopper opens that
// product's detail page — the token comes back on the feed response for
// SerpApi-sourced items, but nothing calls this route until the shopper
// actually looks at that specific product. Never called for a whole feed
// page; each call is a distinct, billed SerpApi request.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  if (!token) {
    return Response.json({ images: [] }, { status: 400 });
  }

  const images = await fetchProductGallery(token);
  return Response.json({ images });
}
