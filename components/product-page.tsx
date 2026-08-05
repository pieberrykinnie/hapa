"use client";

import { motion } from "framer-motion";
import { galleryFor } from "@/lib/gallery";
import type { Product } from "@/lib/types";
import { useHapa } from "./hapa-provider";
import {
  ArrowLeftIcon,
  BookmarkIcon,
  CheckIcon,
  DeliveryIcon,
} from "./icons";
import { ProductPhoto } from "./product-photo";

export function ProductPage({
  product,
  layoutKey,
  onBack,
  onBuy,
}: {
  product: Product;
  layoutKey: string;
  onBack: () => void;
  onBuy: () => void;
}) {
  const { toggleSaved, isSaved, purchaseFor } = useHapa();
  const saved = isSaved(product.id);
  const purchased = purchaseFor(product.id);
  const price = formatPrice(product.price, product.currency);
  const discount = getDiscountLabel(product);
  const perk = getFulfillmentPerk(product.description);
  const description = getDisplayDescription(product.description);
  const fitTags = product.tags
    .filter((tag) => !["for-you", "fashion", "shopping", "style"].includes(tag))
    .slice(0, 3);
  // A real photo (SerpApi thumbnail or curated image) is exactly one frame,
  // not four — the old hardcoded minimum implied a swipeable gallery that
  // was never actually there. This matches the feed card's own frame count.
  const galleryCount = galleryFor(product).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      className="absolute inset-0 z-20 flex flex-col bg-paper"
    >
      {/* hero — shared element from the feed card photo */}
      <motion.div
        layoutId={layoutKey}
        transition={{ type: "spring", damping: 34, stiffness: 460 }}
        className="relative h-[min(52dvh,420px)] shrink-0 overflow-hidden bg-sand"
      >
        <ProductPhoto
          image={product.image}
          caption={`${product.title} — full-bleed photo`}
        />
        <button
          type="button"
          aria-label="Back to feed"
          onClick={onBack}
          className="absolute left-5 top-[calc(env(safe-area-inset-top)+16px)] flex size-11 items-center justify-center rounded-full border border-white/60 bg-white/94 text-ink shadow-float backdrop-blur-sm"
        >
          <ArrowLeftIcon />
        </button>
        <button
          type="button"
          aria-label={saved ? "Remove bookmark" : "Save for later"}
          aria-pressed={saved}
          onClick={() => toggleSaved(product)}
          className={`absolute right-5 top-[calc(env(safe-area-inset-top)+16px)] flex size-11 items-center justify-center rounded-full border shadow-float backdrop-blur-sm ${
            saved ? "border-pine/20 bg-lime" : "border-white/60 bg-white/94"
          }`}
        >
          <BookmarkIcon
            size={22}
            filled={saved}
            color={saved ? "#3f7d20" : "#14080e"}
          />
        </button>
        {galleryCount > 1 && (
          <div className="absolute inset-x-0 bottom-3.5 flex justify-center gap-[5px]">
            {Array.from({ length: galleryCount }).map((_, i) => (
              <span
                key={i}
                className={`h-[5px] rounded-[3px] ${
                  i === 0 ? "w-4 bg-ink" : "w-[5px] bg-ink/30"
                }`}
              />
            ))}
          </div>
        )}
      </motion.div>

      <div className="flex flex-1 flex-col overflow-y-auto px-6 pt-5">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-pine">
            {product.merchant}
          </p>
          <h1 className="font-display text-[25px] font-bold leading-[1.16] tracking-[-0.025em] text-ink">
            {product.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <span className="font-display text-[22px] font-bold text-ink">
              {price}
            </span>
            {discount && (
              <span className="rounded-md bg-lime px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.04em] text-ink">
                {discount}
              </span>
            )}
          </div>
        </div>

        {purchased && (
          <div className="mt-4 flex items-center gap-3 rounded-frame border border-pine/15 bg-pine-tint px-3.5 py-3 text-pine">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-pine text-paper">
              <CheckIcon size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-ink">Already bought</p>
              <p className="mt-0.5 truncate text-[11.5px] font-medium text-pine">
                Shipping to you · {purchased.orderRef}
              </p>
            </div>
          </div>
        )}

        {perk && !purchased && (
          <div className="mt-3 flex items-center gap-2 text-[13px] font-semibold text-pine">
            <DeliveryIcon size={16} />
            <span>{perk}</span>
          </div>
        )}

        {fitTags.length > 0 && (
          <div className="mt-5 border-t border-line pt-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-faint">
              Why it fits
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {fitTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-sand px-3 py-1.5 text-[11.5px] font-semibold capitalize text-ink-soft"
                >
                  {tag.replaceAll("-", " ")}
                </span>
              ))}
            </div>
          </div>
        )}

        {description && (
          <p className="mt-4 line-clamp-3 text-[13.5px] leading-relaxed text-ink-soft">
            {description}
          </p>
        )}
      </div>

      <div className="shrink-0 bg-paper px-6 pb-[calc(env(safe-area-inset-bottom)+22px)] pt-4">
        <button
          type="button"
          onClick={onBuy}
          className="w-full rounded-full bg-ink py-[16px] font-display text-[15px] font-bold text-paper shadow-[0_6px_18px_rgba(20,8,14,0.16)] active:scale-[0.99]"
        >
          {purchased ? "Buy another" : "Buy now"} · {price}
        </button>
        <p className="mt-2.5 whitespace-nowrap text-center text-[10.5px] text-ink-faint">
          HAPA prepares checkout. You confirm before payment.
        </p>
      </div>
    </motion.div>
  );
}

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: currency || "CAD",
    maximumFractionDigits: Number.isInteger(price) ? 0 : 2,
  }).format(price);
}

function getDiscountLabel(product: Product): string | null {
  if (product.salePct) return `${product.salePct}% off`;
  const match = product.description.match(/\b(\d{1,2})%\s*off\b/i);
  return match ? `${match[1]}% off` : null;
}

function getFulfillmentPerk(description: string): string | null {
  if (/free\s+(delivery|shipping)/i.test(description)) return "Free delivery";
  if (/same[- ]day\s+(delivery|shipping)/i.test(description)) {
    return "Same-day delivery";
  }
  if (/(store|curbside)\s+pickup|pick\s*up/i.test(description)) {
    return "Pickup available";
  }
  if (/free\s+returns?|easy\s+returns?/i.test(description)) return "Free returns";
  return null;
}

function getDisplayDescription(description: string) {
  if (/^\s*\d{1,2}%\s*off\s*$/i.test(description)) return "";
  return description;
}
