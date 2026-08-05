"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Product } from "@/lib/types";
import { useHapa } from "./hapa-provider";
import { HeartIcon, MicIcon } from "./icons";
import { ProductPhoto } from "./product-photo";

const CATEGORIES = [
  { id: "for-you", label: "For you" },
  { id: "camping", label: "Camping" },
  { id: "desk", label: "Desk" },
  { id: "fits", label: "Fits" },
  { id: "home", label: "Home" },
];

// Card height is container minus 90px, gap is 14px → the next card peeks ~76px.
const PEEK = 90;
const GAP = 14;

export function Feed({
  onOpenProduct,
  onBuy,
  onOpenVoice,
}: {
  onOpenProduct: (product: Product, layoutKey: string) => void;
  onBuy: (product: Product) => void;
  onOpenVoice: () => void;
}) {
  const { items, activeCategory, status, toast, setCategory, loadMore, dismissToast } =
    useHapa();
  const scrollRef = useRef<HTMLDivElement>(null);

  // decisive reset: jump back to top whenever the feed is flushed
  useEffect(() => {
    if (status === "shifting" || status === "loading") {
      scrollRef.current?.scrollTo({ top: 0 });
    }
  }, [status]);

  // toast persists briefly while new items load, then dismisses itself
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(dismissToast, 4000);
    return () => window.clearTimeout(t);
  }, [toast, dismissToast]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    // prefetch when ~3 cards from the end
    const nearEnd =
      el.scrollHeight - el.scrollTop - el.clientHeight < el.clientHeight * 3;
    if (nearEnd) loadMore();
  };

  const showSkeletons = items.length === 0 && status !== "idle";

  return (
    <div className="relative flex h-dvh flex-col bg-paper">
      {/* category chips */}
      <div className="relative shrink-0 pt-[calc(env(safe-area-inset-top)+10px)]">
        <div
          className="flex items-center gap-2 overflow-x-auto px-5 pb-3.5"
          style={{ scrollbarWidth: "none" }}
        >
          {CATEGORIES.map((cat) => {
            const active = cat.id === activeCategory;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${
                  active
                    ? "bg-pine text-paper"
                    : "border border-line bg-card text-ink-soft"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-r from-transparent to-paper" />
      </div>

      {/* vibe-shift toast, persisting briefly over the feed */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute inset-x-0 top-[calc(env(safe-area-inset-top)+62px)] z-20 flex justify-center px-6"
          >
            <div className="rounded-xl bg-bubble px-4 py-2.5 text-center text-[13px] font-medium text-paper-dim shadow-float">
              {toast}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* snap feed */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="snap-feed flex-1 overflow-y-auto px-4"
        style={{ display: "flex", flexDirection: "column", gap: GAP }}
      >
        {showSkeletons
          ? [0, 1].map((i) => (
              <div
                key={i}
                className="skeleton shrink-0 snap-start rounded-card"
                style={{ height: `calc(100% - ${PEEK}px)` }}
              />
            ))
          : items.map((product, i) => (
              <FeedCard
                key={`${product.id}-${i}`}
                // the looping feed repeats products, so the shared-element id
                // must be unique per card instance, not per product
                layoutKey={`photo-${product.id}-${i}`}
                product={product}
                onOpen={() => onOpenProduct(product, `photo-${product.id}-${i}`)}
                onBuy={() => onBuy(product)}
              />
            ))}
        <div className="h-1 shrink-0" />
      </div>

      {/* mic — deliberately quiet */}
      <button
        type="button"
        aria-label="Talk to hapa"
        onClick={onOpenVoice}
        className="absolute bottom-[calc(env(safe-area-inset-bottom)+24px)] right-[26px] z-20 flex size-12 items-center justify-center rounded-full border-[1.5px] border-line bg-card shadow-float"
      >
        <MicIcon />
      </button>
    </div>
  );
}

function FeedCard({
  product,
  layoutKey,
  onOpen,
  onBuy,
}: {
  product: Product;
  layoutKey: string;
  onOpen: () => void;
  onBuy: () => void;
}) {
  const { dna } = useHapa();
  const matches = product.tags.filter((t) => dna.likes.includes(t)).slice(0, 2);

  return (
    <div
      className="flex shrink-0 snap-start flex-col overflow-hidden rounded-card border border-line bg-card"
      style={{ height: `calc(100% - ${PEEK}px)` }}
    >
      <motion.button
        type="button"
        layoutId={layoutKey}
        onClick={onOpen}
        className="relative flex-1 cursor-pointer overflow-hidden text-left"
      >
        <ProductPhoto
          image={product.image}
          caption={`${product.title} — photo`}
        />
        {matches.length > 0 && (
          <div className="absolute left-3.5 top-3.5 flex gap-1.5">
            {matches.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white/92 px-2.5 py-1 text-xs font-semibold text-ink-soft"
              >
                +{tag}
              </span>
            ))}
          </div>
        )}
      </motion.button>
      <div className="flex items-center justify-between gap-3 px-[18px] py-3.5">
        <div className="min-w-0">
          <div className="truncate font-display text-[17px] font-bold text-ink">
            {product.title}
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-[13.5px] font-medium text-ink-soft">
            ${product.price} · {product.merchant}
            {dna.likes.some((t) => product.tags.includes(t)) && (
              <span className="ml-1 inline-flex items-center gap-1 text-xs text-ink-faint">
                <HeartIcon size={13} color="#8a8378" />
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onBuy}
          className="shrink-0 rounded-full bg-ink px-[18px] py-[11px] font-display text-sm font-bold text-paper"
        >
          Buy now
        </button>
      </div>
    </div>
  );
}
