import type { Product } from "./types";

export interface GallerySlot {
  key: string;
  image: string;
  caption: string;
}

const ANGLES = ["front", "detail", "in use", "packed"];

/**
 * Frames for the in-card image swiper.
 *
 * Real photos (SerpApi thumbnails or curated images) are used when present.
 * Until then each product gets a few captioned placeholder frames so the
 * horizontal swipe has something to move through.
 */
export function galleryFor(product: Product): GallerySlot[] {
  const real = [product.image, ...product.gallery].filter(Boolean);
  if (real.length > 0) {
    return real.map((image, i) => ({
      key: `${product.id}-img-${i}`,
      image,
      caption: product.title,
    }));
  }
  return ANGLES.map((angle, i) => ({
    key: `${product.id}-ph-${i}`,
    image: "",
    caption: `${product.title} — ${angle}`,
  }));
}
