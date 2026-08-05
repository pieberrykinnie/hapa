"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { galleryFor } from "@/lib/gallery";
import type { Product } from "@/lib/types";
import { AddVibeRadial, type AddVibeMode } from "./add-vibe-radial";
import { useHapa } from "./hapa-provider";
import { BookmarkIcon } from "./icons";
import { ProductPhoto } from "./product-photo";

const CATEGORIES = [
  { id: "for-you", label: "For you" },
  { id: "saved", label: "Saved" },
  { id: "camping", label: "Camping" },
  { id: "desk", label: "Desk" },
  { id: "fits", label: "Fits" },
  { id: "home", label: "Home" },
];

// Card height is container minus 90px, gap is 14px → the next card peeks ~76px.
const PEEK = 90;
const GAP = 14;
// A touch has to move this many px before it counts as a swipe rather than a
// tap on a card/button — keeps taps from flickering the chip bar.
const SWIPE_MOVE_PX = 6;

export function Feed({
  onOpenProduct,
  onBuy,
  onOpenAddVibe,
}: {
  onOpenProduct: (product: Product, layoutKey: string) => void;
  onBuy: (product: Product) => void;
  onOpenAddVibe: (mode: AddVibeMode) => void;
}) {
  const {
    items,
    saved,
    activeCategory,
    status,
    toast,
    setCategory,
    loadMore,
    dismissToast,
  } = useHapa();
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const swiping = useRef(false);
  const [chipsHidden, setChipsHidden] = useState(false);
  const [addVibeOpen, setAddVibeOpen] = useState(false);

  const showingSaved = activeCategory === "saved";
  const list = showingSaved ? saved : items;

  // decisive reset: jump back to top whenever the feed is flushed
  useEffect(() => {
    if (status !== "shifting" && status !== "loading") return;
    scrollRef.current?.scrollTo({ top: 0 });
    swiping.current = false;
    touchStartY.current = null;
    const id = requestAnimationFrame(() => setChipsHidden(false));
    return () => cancelAnimationFrame(id);
  }, [status]);

  // toast persists briefly while new items load, then dismisses itself
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(dismissToast, 4000);
    return () => window.clearTimeout(t);
  }, [toast, dismissToast]);

  // Chips duck out only for an actual swipe (real vertical movement, not a
  // tap) and reappear the instant the finger lifts — not when the snap
  // animation happens to settle, which can lag well behind release.
  const handlePointerDown = (e: PointerEvent) => {
    touchStartY.current = e.clientY;
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (touchStartY.current === null || swiping.current) return;
    if (Math.abs(e.clientY - touchStartY.current) > SWIPE_MOVE_PX) {
      swiping.current = true;
      setChipsHidden(true);
      setAddVibeOpen(false);
    }
  };

  const endSwipe = () => {
    touchStartY.current = null;
    if (swiping.current) {
      swiping.current = false;
      setChipsHidden(false);
    }
  };

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setAddVibeOpen(false);
    if (showingSaved) return; // saved list isn't paginated
    // prefetch when ~3 cards from the end
    const nearEnd =
      el.scrollHeight - el.scrollTop - el.clientHeight < el.clientHeight * 3;
    if (nearEnd) loadMore();
  };

  const showSkeletons = list.length === 0 && status !== "idle";

  return (
    <div className="relative flex h-dvh flex-col bg-paper">
      {/* category chips — collapse on scroll down, return on scroll up */}
      <motion.div
        className="relative z-10 shrink-0 overflow-hidden pt-[calc(env(safe-area-inset-top)+10px)]"
        animate={{
          height: chipsHidden ? 0 : "auto",
          opacity: chipsHidden ? 0 : 1,
        }}
        initial={false}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
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
                {cat.id === "saved" && saved.length > 0 && (
                  <span className={active ? "text-paper/70" : "text-ink-faint"}>
                    {" "}
                    {saved.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-r from-transparent to-paper" />
      </motion.div>

      {/* vibe-shift toast, persisting briefly over the feed */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
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
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endSwipe}
        onPointerCancel={endSwipe}
        onPointerLeave={endSwipe}
        className="snap-feed flex-1 overflow-y-auto px-4"
        style={{ display: "flex", flexDirection: "column", gap: GAP }}
      >
        {showSkeletons ? (
          [0, 1].map((i) => (
            <div
              key={i}
              className="skeleton shrink-0 snap-start rounded-card"
              style={{ height: `calc(100% - ${PEEK}px)` }}
            />
          ))
        ) : list.length === 0 && showingSaved ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-10 text-center">
            <BookmarkIcon size={28} color="#918a89" />
            <p className="font-display text-base font-bold text-ink">
              Nothing saved yet
            </p>
            <p className="text-[13.5px] text-ink-soft">
              Tap the bookmark on any card to keep it here.
            </p>
          </div>
        ) : (
          list.map((product, i) => (
            <FeedCard
              key={`${product.id}-${i}`}
              // the looping feed repeats products, so the shared-element id
              // must be unique per card instance, not per product
              layoutKey={`photo-${product.id}-${i}`}
              product={product}
              onOpen={() => onOpenProduct(product, `photo-${product.id}-${i}`)}
              onBuy={() => onBuy(product)}
            />
          ))
        )}
        <div className="h-1 shrink-0" />
      </div>

      {/* add — text, speech, or photo, hapa's three ways to steer the feed */}
      <AddVibeRadial
        open={addVibeOpen}
        onOpenChange={setAddVibeOpen}
        onSelect={onOpenAddVibe}
      />
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
  const { toggleSaved, isSaved } = useHapa();
  const slots = galleryFor(product);
  const railRef = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState(0);
  const saved = isSaved(product.id);

  const onRailScroll = () => {
    const el = railRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== frame) setFrame(i);
  };

  return (
    <div
      className="flex shrink-0 snap-start flex-col overflow-hidden rounded-card border border-line bg-card"
      style={{ height: `calc(100% - ${PEEK}px)` }}
    >
      {/* swipeable image rail — horizontal snap inside the vertical feed */}
      <motion.div
        layoutId={layoutKey}
        transition={{ type: "spring", damping: 34, stiffness: 460 }}
        className="relative min-h-0 flex-1"
      >
        <div
          ref={railRef}
          onScroll={onRailScroll}
          className="flex h-full w-full snap-x snap-mandatory overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
        >
          {slots.map((slot) => (
            <button
              key={slot.key}
              type="button"
              onClick={onOpen}
              aria-label={`Open ${product.title}`}
              className="h-full w-full shrink-0 snap-center"
            >
              <ProductPhoto image={slot.image} caption={slot.caption} />
            </button>
          ))}
        </div>

        <button
          type="button"
          aria-label={saved ? "Remove bookmark" : "Save for later"}
          aria-pressed={saved}
          onClick={() => toggleSaved(product)}
          className="absolute right-3 top-3 flex size-11 items-center justify-center rounded-full bg-white/92 shadow-float"
        >
          <BookmarkIcon
            size={20}
            filled={saved}
            color={saved ? "#3f7d20" : "#14080e"}
          />
        </button>

        {slots.length > 1 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-[5px]">
            {slots.map((slot, i) => (
              <span
                key={slot.key}
                className={`h-[5px] rounded-[3px] transition-all duration-150 ${
                  i === frame ? "w-4 bg-ink" : "w-[5px] bg-ink/30"
                }`}
              />
            ))}
          </div>
        )}
      </motion.div>

      <div className="shrink-0 px-[18px] pb-3.5 pt-3">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={onOpen}
            className="min-w-0 flex-1 text-left"
          >
            <div className="truncate font-display text-[17px] font-bold text-ink">
              {product.title}
            </div>
            <div className="mt-0.5 text-[13.5px] font-medium text-ink-soft">
              ${product.price} · {product.merchant}
            </div>
          </button>
          <button
            type="button"
            onClick={onBuy}
            className="shrink-0 rounded-full bg-ink px-[18px] py-[11px] font-display text-sm font-bold text-paper"
          >
            Buy now
          </button>
        </div>
        <p className="mt-2 line-clamp-2 text-[13.5px] leading-[1.5] text-ink-soft">
          {product.description}
        </p>
      </div>
    </div>
  );
}
