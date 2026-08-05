"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { galleryFor } from "@/lib/gallery";
import { resetLocalOnboarding } from "@/lib/onboarding/local-store";
import type { Product } from "@/lib/types";
import { AddVibeRadial, type AddVibeMode } from "./add-vibe-radial";
import { useHapa } from "./hapa-provider";
import { BookmarkIcon, CheckIcon, DeliveryIcon } from "./icons";
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
  const scrollFrameRef = useRef(0);
  const scrollEndTimerRef = useRef<number | null>(null);
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
      // Momentum may continue after the finger lifts. Let the scroll-settle
      // timer reveal the chips so they do not flash back mid-snap.
      if (scrollEndTimerRef.current === null) setChipsHidden(false);
    }
  };

  // Scroll events fire far faster than paint; coalescing to one frame keeps the
  // layout reads below (scrollHeight/clientHeight) from flushing style on every
  // event, which is what turns a long feed's scroll into a stutter.
  const handleScroll = () => {
    setChipsHidden(true);
    if (scrollEndTimerRef.current !== null) {
      window.clearTimeout(scrollEndTimerRef.current);
    }
    scrollEndTimerRef.current = window.setTimeout(() => {
      scrollEndTimerRef.current = null;
      setChipsHidden(false);
    }, 140);

    if (scrollFrameRef.current) return;
    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollFrameRef.current = 0;
      const el = scrollRef.current;
      if (!el) return;
      setAddVibeOpen(false);
      if (showingSaved) return; // saved list isn't paginated
      // prefetch when ~3 cards from the end
      const nearEnd =
        el.scrollHeight - el.scrollTop - el.clientHeight < el.clientHeight * 3;
      if (nearEnd) loadMore();
    });
  };

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current) cancelAnimationFrame(scrollFrameRef.current);
      if (scrollEndTimerRef.current !== null) {
        window.clearTimeout(scrollEndTimerRef.current);
      }
    };
  }, []);

  const showSkeletons = list.length === 0 && status !== "idle";

  // Held across renders so toggling the chip bar mid-scroll doesn't re-render
  // every mounted card (each carries a `layoutId` element framer re-measures).
  const cards = useMemo(
    () =>
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
      )),
    [list, onOpenProduct, onBuy],
  );

  return (
    <div className="relative flex h-dvh flex-col bg-paper">
      {/* Category chips — duck out for the duration of a swipe (see the
          pointer handlers above). They fade and lift rather than collapsing
          their height: the bar sits above the snap scroller, so animating its
          height resized the scroller — and every card, which is sized off it —
          on every frame of the transition. A `y mandatory` scroller re-snaps
          whenever it's resized, so that fought the gesture, worst on the
          reveal, where the height animates back to "auto" and framer has to
          re-measure the subtree each frame. */}
      <motion.div
        data-testid="feed-category-bar"
        className="relative z-10 shrink-0 overflow-hidden pt-[calc(env(safe-area-inset-top)+10px)]"
        animate={{
          y: chipsHidden ? -10 : 0,
          opacity: chipsHidden ? 0 : 1,
        }}
        style={{ pointerEvents: chipsHidden ? "none" : "auto" }}
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
          <button
            type="button"
            onClick={() => {
              resetLocalOnboarding();
              window.location.reload();
            }}
            className="ml-auto whitespace-nowrap rounded-full border border-line bg-card px-4 py-2 text-[13px] font-semibold text-ink-soft"
          >
            Replay onboarding
          </button>
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
        className={
          showingSaved
            ? "flex-1 overflow-y-auto px-4"
            : "snap-feed flex-1 overflow-y-auto px-4"
        }
        style={
          showingSaved
            ? { scrollbarWidth: "none" }
            : { display: "flex", flexDirection: "column", gap: GAP }
        }
      >
        {showingSaved ? (
          <SavedCollection
            products={saved}
            onOpenProduct={onOpenProduct}
            onBuy={onBuy}
            onBrowse={() => setCategory("for-you")}
          />
        ) : showSkeletons ? (
          [0, 1].map((i) => (
            <div
              key={i}
              className="feed-card skeleton shrink-0 rounded-card"
              style={{ height: `calc(100% - ${PEEK}px)` }}
            />
          ))
        ) : (
          cards
        )}
        <div className="h-1 shrink-0" />
      </div>

      {/* add — text, speech, or photo, hapa's three ways to steer the feed */}
      {!showingSaved && (
        <AddVibeRadial
          open={addVibeOpen}
          onOpenChange={setAddVibeOpen}
          onSelect={onOpenAddVibe}
        />
      )}
    </div>
  );
}

function SavedCollection({
  products,
  onOpenProduct,
  onBuy,
  onBrowse,
}: {
  products: Product[];
  onOpenProduct: (product: Product, layoutKey: string) => void;
  onBuy: (product: Product) => void;
  onBrowse: () => void;
}) {
  if (products.length === 0) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-8 pb-16 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-sand text-pine">
          <BookmarkIcon size={27} color="#3f7d20" />
        </div>
        <h2 className="mt-5 font-display text-[22px] font-bold tracking-[-0.02em] text-ink">
          Your shortlist starts here
        </h2>
        <p className="mt-2 max-w-[270px] text-[13.5px] leading-relaxed text-ink-soft">
          Save anything worth a second look. It will stay ready here.
        </p>
        <button
          type="button"
          onClick={onBrowse}
          className="mt-6 rounded-full bg-ink px-6 py-3 font-display text-sm font-bold text-paper"
        >
          Browse for you
        </button>
      </div>
    );
  }

  return (
    <div className="pb-[calc(env(safe-area-inset-bottom)+24px)]">
      <div className="flex items-end justify-between px-1 pb-4 pt-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-pine">
            Your shortlist
          </p>
          <h2 className="mt-1 font-display text-[24px] font-bold tracking-[-0.025em] text-ink">
            Saved for later
          </h2>
        </div>
        <span className="pb-1 text-[12px] font-semibold text-ink-faint">
          {products.length} {products.length === 1 ? "item" : "items"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {products.map((product, index) => {
          const layoutKey = `saved-photo-${product.id}-${index}`;
          return (
            <SavedCard
              key={layoutKey}
              product={product}
              layoutKey={layoutKey}
              onOpen={() => onOpenProduct(product, layoutKey)}
              onBuy={() => onBuy(product)}
            />
          );
        })}
      </div>
    </div>
  );
}

function SavedCard({
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
  const { toggleSaved, purchaseFor } = useHapa();
  const purchased = purchaseFor(product.id);
  const discount = getDiscountLabel(product);

  return (
    <article className="overflow-hidden rounded-[18px] border border-line/80 bg-card shadow-[0_7px_22px_rgba(20,8,14,0.06)]">
      <motion.div layoutId={layoutKey} className="relative aspect-[4/5] bg-sand">
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Open saved ${product.title}`}
          className="h-full w-full"
        >
          <ProductPhoto image={product.image} caption={product.title} />
        </button>
        <button
          type="button"
          aria-label={`Remove ${product.title} from saved`}
          onClick={() => toggleSaved(product)}
          className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-full border border-pine/15 bg-lime shadow-float"
        >
          <BookmarkIcon size={17} filled color="#3f7d20" />
        </button>
        {purchased && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-ink/88 px-2.5 py-1.5 text-[9.5px] font-bold text-paper backdrop-blur-sm">
            <CheckIcon size={12} />
            Shipping
          </div>
        )}
      </motion.div>

      <div className="p-3">
        <p className="truncate text-[9px] font-bold uppercase tracking-[0.07em] text-pine">
          {product.merchant}
        </p>
        <button type="button" onClick={onOpen} className="mt-1 block w-full text-left">
          <h3 className="line-clamp-2 min-h-[38px] font-display text-[14px] font-semibold leading-[1.35] text-ink">
            {product.title}
          </h3>
        </button>
        <div className="mt-2 flex items-center gap-1.5">
          <span className="font-display text-[16px] font-bold text-ink">
            {formatPrice(product.price, product.currency)}
          </span>
          {discount && (
            <span className="rounded bg-lime px-1.5 py-1 text-[8.5px] font-bold uppercase text-ink">
              {discount}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onBuy}
          className="mt-3 w-full rounded-full bg-ink py-2.5 font-display text-[12px] font-bold text-paper"
        >
          {purchased ? "Buy another" : "Buy now"}
        </button>
      </div>
    </article>
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
  const { toggleSaved, isSaved, purchaseFor } = useHapa();
  const slots = galleryFor(product);
  const railRef = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState(0);
  const saved = isSaved(product.id);
  const purchased = purchaseFor(product.id);
  const discount = getDiscountLabel(product);
  const perk = getFulfillmentPerk(product.description);
  const description = getDisplayDescription(product.description, discount, perk);
  const vibe = getVibeLabel(product.tags);

  const onRailScroll = () => {
    const el = railRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== frame) setFrame(i);
  };

  return (
    <div
      className="feed-card flex shrink-0 flex-col overflow-hidden rounded-card border border-line/80 bg-card shadow-[0_10px_34px_rgba(20,8,14,0.07)]"
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

        {vibe && (
          <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-ink/88 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-paper shadow-float backdrop-blur-sm">
            For your {vibe} vibe
          </div>
        )}

        <button
          type="button"
          aria-label={saved ? "Remove bookmark" : "Save for later"}
          aria-pressed={saved}
          onClick={() => toggleSaved(product)}
          className={`absolute right-3 top-3 flex size-11 items-center justify-center rounded-full border shadow-float backdrop-blur-sm transition-colors ${
            saved
              ? "border-pine/20 bg-lime text-pine"
              : "border-white/60 bg-white/92 text-ink"
          }`}
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

      <div className="shrink-0 px-[18px] pb-4 pt-3.5">
        <div className="flex items-end justify-between gap-4">
          <button
            type="button"
            onClick={onOpen}
            className="min-w-0 flex-1 text-left"
          >
            <div className="mb-1 truncate text-[10px] font-bold uppercase tracking-[0.08em] text-pine">
              {product.merchant}
            </div>
            <div className="truncate font-display text-[18px] font-semibold leading-tight text-ink">
              {product.title}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="font-display text-xl font-bold leading-none text-ink">
                {formatPrice(product.price, product.currency)}
              </span>
              {discount && (
                <span className="rounded-md bg-lime px-2 py-1 text-[11px] font-bold uppercase tracking-[0.04em] text-ink">
                  {discount}
                </span>
              )}
            </div>
          </button>
          <button
            type="button"
            onClick={onBuy}
            className="shrink-0 rounded-full bg-ink px-5 py-3 font-display text-sm font-bold text-paper shadow-[0_5px_16px_rgba(20,8,14,0.18)] transition-transform active:scale-[0.98]"
          >
            {purchased ? "Buy another" : "Buy now"}
          </button>
        </div>
        {purchased ? (
          <div className="mt-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-pine">
            <CheckIcon size={15} />
            <span>Bought · Shipping to you</span>
          </div>
        ) : perk ? (
          <div className="mt-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-pine">
            <DeliveryIcon size={15} />
            <span>{perk}</span>
          </div>
        ) : description ? (
          <p className="mt-2 line-clamp-1 text-[12.5px] leading-[1.45] text-ink-faint">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function getDiscountLabel(product: Product): string | null {
  if (product.salePct) return `${product.salePct}% off`;
  const match = product.description.match(/\b(\d{1,2})%\s*off\b/i);
  return match ? `${match[1]}% off` : null;
}

function getDisplayDescription(
  description: string,
  discount: string | null,
  perk: string | null,
) {
  if (!description) return "";
  if (discount && description.trim().toLowerCase() === discount.toLowerCase()) {
    return "";
  }
  if (perk) return "";
  return description;
}

function getFulfillmentPerk(description: string): string | null {
  if (/free\s+(same[- ]day|next[- ]day)\s+delivery/i.test(description)) {
    return "Free fast delivery";
  }
  if (/free\s+(delivery|shipping)/i.test(description)) return "Free delivery";
  if (/same[- ]day\s+(delivery|shipping)/i.test(description)) {
    return "Same-day delivery";
  }
  if (/(store|curbside)\s+pickup|pick\s*up/i.test(description)) {
    return "Pickup available";
  }
  if (/free\s+returns?|easy\s+returns?/i.test(description)) {
    return "Free returns";
  }
  return null;
}

function getVibeLabel(tags: string[]): string | null {
  const ignored = new Set(["for-you", "fashion", "shopping", "style"]);
  const tag = tags.find((value) => value && !ignored.has(value.toLowerCase()));
  return tag?.replaceAll("-", " ") ?? null;
}

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: currency || "CAD",
    maximumFractionDigits: Number.isInteger(price) ? 0 : 2,
  }).format(price);
}
