"use client";

import { motion } from "framer-motion";
import type { Product } from "@/lib/types";
import { useHapa } from "./hapa-provider";
import { BookmarkIcon } from "./icons";
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
  const { toggleSaved, isSaved } = useHapa();
  const saved = isSaved(product.id);
  const galleryCount = Math.max(product.gallery.length, 4);

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
        className="relative h-[420px] shrink-0 overflow-hidden"
      >
        <ProductPhoto
          image={product.image}
          caption={`${product.title} — full-bleed photo`}
        />
        <button
          type="button"
          aria-label="Back to feed"
          onClick={onBack}
          className="absolute left-5 top-[calc(env(safe-area-inset-top)+16px)] flex size-11 items-center justify-center rounded-full bg-white/94 text-lg text-ink"
        >
          ←
        </button>
        <button
          type="button"
          aria-label={saved ? "Remove bookmark" : "Save for later"}
          aria-pressed={saved}
          onClick={() => toggleSaved(product)}
          className="absolute right-5 top-[calc(env(safe-area-inset-top)+16px)] flex size-11 items-center justify-center rounded-full bg-white/94"
        >
          <BookmarkIcon
            size={22}
            filled={saved}
            color={saved ? "#3f7d20" : "#14080e"}
          />
        </button>
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
      </motion.div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 pt-6">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-[-0.01em] text-ink">
            {product.title}
          </h1>
          <div className="mt-2 flex items-center gap-2.5">
            <span className="text-lg font-bold text-ink">${product.price}</span>
            {product.salePct != null && (
              <span className="rounded-full bg-lime px-2.5 py-1 text-xs font-semibold text-ink">
                −{product.salePct}% at {product.merchant}
              </span>
            )}
            <span className="text-[13.5px] font-medium text-ink-soft">
              sold by {product.merchant}
            </span>
          </div>
        </div>
        <p className="text-[14.5px] leading-relaxed text-ink-soft">
          {product.description}
        </p>
      </div>

      <div className="shrink-0 px-6 pb-[calc(env(safe-area-inset-bottom)+36px)] pt-4">
        <button
          type="button"
          onClick={onBuy}
          className="w-full rounded-full bg-ink py-[17px] font-display text-base font-bold text-paper"
        >
          Buy now
        </button>
        <p className="mt-2.5 text-center text-xs text-ink-faint">
          hapa checks out at {product.merchant} for you — you confirm first.
        </p>
      </div>
    </motion.div>
  );
}
