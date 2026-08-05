"use client";

import { useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
  type Variants,
} from "framer-motion";
import { ONBOARDING_CARDS } from "@/lib/onboarding-cards";
import { useHapa } from "./hapa-provider";
import { HapaWordmark } from "./hapa-logo";
import { HeartIcon } from "./icons";
import { ProductPhoto } from "./product-photo";

const SWIPE_THRESHOLD = 110;

const CARD_VARIANTS: Variants = {
  enter: { scale: 0.96, opacity: 0 },
  center: { scale: 1, opacity: 1 },
  // `dir` arrives from AnimatePresence's `custom`, read at exit time
  exit: (dir: number) => ({
    x: dir * 480,
    opacity: 0,
    transition: { duration: 0.28, ease: "easeOut" },
  }),
};

export function Onboarding() {
  const { swipe } = useHapa();
  const [index, setIndex] = useState(0);
  // Exit direction for the card flying off: 1 = liked (right), -1 = dismissed
  // (left). Passed through AnimatePresence's `custom` so the *exiting* card
  // reads the value set by the swipe that removed it — component props are
  // already frozen by then, so plain state would lag one card behind.
  const [exitDir, setExitDir] = useState(-1);

  const card = ONBOARDING_CARDS[index];
  const nextCard = ONBOARDING_CARDS[index + 1];

  const commit = (liked: boolean) => {
    if (!card) return;
    setExitDir(liked ? 1 : -1);
    swipe(card.tags, liked, index === ONBOARDING_CARDS.length - 1);
    setIndex((i) => i + 1);
  };

  return (
    <div className="flex h-dvh flex-col bg-paper">
      <header className="flex flex-col gap-2 px-7 pt-[calc(env(safe-area-inset-top)+20px)]">
        <HapaWordmark />
        <h1 className="font-display text-[28px] font-extrabold leading-[1.15] tracking-[-0.02em] text-ink">
          This you?
        </h1>
        <p className="text-[14.5px] text-ink-soft">
          Swipe right if it&apos;s your vibe. 5 cards, that&apos;s it.
        </p>
      </header>

      <div className="relative flex-1 px-7 py-6">
        {/* next card peeking behind */}
        {nextCard && (
          <div className="absolute inset-x-5 top-6 bottom-8 rotate-[4deg] rounded-3xl bg-sand-deep" />
        )}
        <AnimatePresence custom={exitDir}>
          {card && (
            <SwipeCard
              key={card.id}
              caption={card.caption}
              image={card.image}
              label={card.label}
              onCommit={commit}
            />
          )}
        </AnimatePresence>
      </div>

      <div className="flex justify-center gap-6 px-7 pb-[calc(env(safe-area-inset-bottom)+36px)] pt-2">
        <button
          type="button"
          aria-label="Not my vibe"
          onClick={() => commit(false)}
          className="flex size-16 items-center justify-center rounded-full border-[1.5px] border-line bg-card text-2xl text-ink-faint"
        >
          ✕
        </button>
        <button
          type="button"
          aria-label="My vibe"
          onClick={() => commit(true)}
          className="flex size-16 items-center justify-center rounded-full bg-pine"
        >
          <HeartIcon />
        </button>
      </div>
    </div>
  );
}

function SwipeCard({
  caption,
  image,
  label,
  onCommit,
}: {
  caption: string;
  image: string;
  label: string;
  onCommit: (liked: boolean) => void;
}) {
  const x = useMotionValue(0);
  // resting tilt is the -2° from the design; drag rotates around it, and the
  // fly-off inherits the rotation for free by driving the same value
  const rotate = useTransform(x, [-220, 0, 220], [-16, -2, 12]);

  return (
    <motion.div
      className="absolute inset-x-7 top-6 bottom-8 flex flex-col overflow-hidden rounded-3xl bg-card shadow-card"
      style={{ x, rotate }}
      variants={CARD_VARIANTS}
      initial="enter"
      animate="center"
      exit="exit"
      drag="x"
      dragSnapToOrigin
      dragElastic={0.8}
      onDragEnd={(_, info) => {
        if (info.offset.x > SWIPE_THRESHOLD) onCommit(true);
        else if (info.offset.x < -SWIPE_THRESHOLD) onCommit(false);
      }}
    >
      <div className="flex-1">
        <ProductPhoto image={image} caption={caption} variant="light" />
      </div>
      <div className="px-5 py-4">
        <div className="font-display text-base font-semibold text-ink">
          {label}
        </div>
      </div>
    </motion.div>
  );
}
