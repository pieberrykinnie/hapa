"use client";

import { useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { ONBOARDING_CARDS } from "@/lib/onboarding-cards";
import { useHapa } from "./hapa-provider";
import { HeartIcon } from "./icons";
import { ProductPhoto } from "./product-photo";

const SWIPE_THRESHOLD = 110;

export function Onboarding() {
  const { swipe } = useHapa();
  const [index, setIndex] = useState(0);
  // exit direction for the flying card: 1 = liked (right), -1 = dismissed (left)
  const [exitDir, setExitDir] = useState(1);

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
      <header className="flex flex-col gap-1.5 px-7 pt-[calc(env(safe-area-inset-top)+20px)]">
        <span className="font-display text-[15px] font-bold tracking-[-0.01em] text-pine">
          hapa
        </span>
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
        <AnimatePresence>
          {card && (
            <SwipeCard
              key={card.id}
              caption={card.caption}
              image={card.image}
              label={card.label}
              step={index + 1}
              exitDir={exitDir}
              onCommit={commit}
            />
          )}
        </AnimatePresence>
      </div>

      <div className="flex justify-center gap-6 px-7 pb-5">
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

      <div className="flex justify-center gap-1.5 pb-[calc(env(safe-area-inset-bottom)+32px)]">
        {ONBOARDING_CARDS.map((c, i) => (
          <span
            key={c.id}
            className={`h-[5px] w-[18px] rounded-[3px] ${
              i < index ? "bg-pine" : "bg-line"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function SwipeCard({
  caption,
  image,
  label,
  step,
  exitDir,
  onCommit,
}: {
  caption: string;
  image: string;
  label: string;
  step: number;
  exitDir: number;
  onCommit: (liked: boolean) => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-14, 10]);

  return (
    <motion.div
      className="absolute inset-x-7 top-6 bottom-8 flex flex-col overflow-hidden rounded-3xl bg-card shadow-card"
      style={{ x, rotate }}
      initial={{ rotate: -2, scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{
        x: exitDir * 480,
        rotate: exitDir * 18,
        opacity: 0,
        transition: { duration: 0.32, ease: "easeOut" },
      }}
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
        <div className="mt-0.5 text-xs font-medium text-ink-faint">
          card {step} of 5
        </div>
      </div>
    </motion.div>
  );
}
