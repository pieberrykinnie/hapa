"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
  type Variants,
} from "framer-motion";
import type { VisualProfile } from "@/lib/onboarding/local-store";
import type { StyleSuggestion, SuggestionDecision } from "@/lib/types";
import { HeartIcon } from "@/components/icons";
import { OnboardingFrame } from "./OnboardingFrame";

const SWIPE_OFFSET = 110;
const SWIPE_VELOCITY = 500;

const CARD_VARIANTS: Variants = {
  enter: { scale: .96, opacity: 0 },
  center: { scale: 1, opacity: 1 },
  exit: (direction: number) => ({
    x: direction * 480,
    opacity: 0,
    transition: { duration: .28, ease: "easeOut" },
  }),
};

export function ThisYouDeck({
  suggestions,
  decisions,
  visualProfile,
  onDecision,
  onComplete,
}: {
  suggestions: StyleSuggestion[];
  decisions: Record<string, SuggestionDecision>;
  visualProfile: VisualProfile | null;
  onDecision: (suggestion: StyleSuggestion, decision: SuggestionDecision) => { complete: boolean; summary: string | null };
  onComplete: () => void;
}) {
  const initialIndex = useMemo(() => {
    const first = suggestions.findIndex((item) => !decisions[item.id]);
    return first < 0 ? suggestions.length : first;
  }, [decisions, suggestions]);
  const [index, setIndex] = useState(initialIndex);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [exitDirection, setExitDirection] = useState(-1);

  useEffect(() => {
    for (const suggestion of suggestions) {
      if (!suggestion.imageUrl) continue;
      const preload = new Image();
      preload.src = suggestion.imageUrl;
      void preload.decode?.().catch(() => undefined);
    }
  }, [suggestions]);

  const commit = useCallback((decision: SuggestionDecision) => {
    const suggestion = suggestions[index];
    if (!suggestion || busy) return;
    setBusy(true);
    setError(null);
    setExitDirection(decision === "accept" ? 1 : -1);
    try {
      const result = onDecision(suggestion, decision);
      if (result.complete) {
        setSummary(result.summary ?? "Your vibe is locked in.");
        window.setTimeout(onComplete, 650);
      } else {
        setIndex((value) => value + 1);
        setBusy(false);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save that choice on this device.");
      setBusy(false);
    }
  }, [busy, index, onComplete, onDecision, suggestions]);

  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") { event.preventDefault(); commit("reject"); }
      if (event.key === "ArrowRight") { event.preventDefault(); commit("accept"); }
    }
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [commit]);

  if (summary) {
    return (
      <OnboardingFrame step={2} title="Locking in your vibe…" description={summary}>
        <div className="flex flex-1 items-center justify-center">
          <motion.div animate={{ scale: [1, .82, 1] }} transition={{ duration: .65 }} className="size-12 rounded-full bg-pine" />
        </div>
      </OnboardingFrame>
    );
  }

  const card = suggestions[index];
  return (
    <OnboardingFrame step={2} title="This you?" description="Five quick calls. You stay in control.">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between px-7 pt-4 text-[12px] font-semibold tracking-[0.04em] text-ink-faint">
          <span>
            {visualProfile
              ? `${visualProfile.concepts.length ? `Matched ${visualProfile.concepts.join(" + ")} · ` : ""}${visualProfile.imageCount} filename${visualProfile.imageCount === 1 ? "" : "s"}`
              : "Starter mix"}
          </span>
          <span>{Math.min(index + 1, 5)}/5</span>
        </div>

        <div className="relative min-h-0 flex-1 px-7 py-4">
          {suggestions[index + 2] && <div className="absolute inset-x-10 bottom-3 top-8 rotate-[3deg] rounded-3xl bg-line" />}
          {suggestions[index + 1] && <div className="absolute inset-x-8 bottom-5 top-6 rotate-[4deg] rounded-3xl bg-sand-deep" />}
          <AnimatePresence custom={exitDirection}>
            {card && (
              <SwipeCard
                key={card.id}
                suggestion={card}
                direction={exitDirection}
                disabled={busy}
                onCommit={commit}
              />
            )}
          </AnimatePresence>
        </div>

        {error && <p role="alert" className="px-7 text-center text-[13px] text-red-800">{error}</p>}
        <div className="flex shrink-0 justify-center gap-6 px-7 pb-[calc(env(safe-area-inset-bottom)+30px)] pt-2">
          <button type="button" disabled={busy} aria-label={card ? `Nope, reject ${card.title}` : "Nope"} onClick={() => commit("reject")} className="flex size-16 items-center justify-center rounded-full border-[1.5px] border-line bg-card text-2xl text-ink-faint disabled:opacity-40">✕</button>
          <button type="button" disabled={busy} aria-label={card ? `Like, accept ${card.title}` : "Like"} onClick={() => commit("accept")} className="flex size-16 items-center justify-center rounded-full bg-pine disabled:opacity-40"><HeartIcon /></button>
        </div>
      </div>
    </OnboardingFrame>
  );
}

function SwipeCard({
  suggestion,
  direction,
  disabled,
  onCommit,
}: {
  suggestion: StyleSuggestion;
  direction: number;
  disabled: boolean;
  onCommit: (decision: SuggestionDecision) => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 0, 220], [-16, -2, 12]);
  const likeOpacity = useTransform(x, [20, 120], [0, 1]);
  const nopeOpacity = useTransform(x, [-120, -20], [1, 0]);

  return (
    <motion.article
      className="absolute inset-x-7 bottom-5 top-4 flex flex-col overflow-hidden rounded-3xl bg-card shadow-card"
      style={{ x, rotate }}
      variants={CARD_VARIANTS}
      initial="enter"
      animate="center"
      exit="exit"
      custom={direction}
      drag={disabled ? false : "x"}
      dragSnapToOrigin
      dragElastic={.8}
      onDragEnd={(_, info) => {
        if (info.offset.x > SWIPE_OFFSET || info.velocity.x > SWIPE_VELOCITY) onCommit("accept");
        else if (info.offset.x < -SWIPE_OFFSET || info.velocity.x < -SWIPE_VELOCITY) onCommit("reject");
      }}
    >
      <SuggestionArtwork suggestion={suggestion} />
      <motion.div style={{ opacity: likeOpacity }} className="pointer-events-none absolute inset-0 flex items-start justify-start bg-pine/15 p-5"><span className="rotate-[-9deg] rounded-lg border-2 border-pine px-3 py-1 text-[15px] font-bold text-pine">LIKE</span></motion.div>
      <motion.div style={{ opacity: nopeOpacity }} className="pointer-events-none absolute inset-0 flex items-start justify-end bg-red-500/10 p-5"><span className="rotate-[9deg] rounded-lg border-2 border-red-500 px-3 py-1 text-[15px] font-bold text-red-600">NOPE</span></motion.div>
      <div className="shrink-0 px-5 py-4">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-pine">
          {suggestion.category.replaceAll("-", " ")}
        </p>
        <h2 className="text-[18px] font-semibold leading-6 tracking-[-0.02em] text-ink">{suggestion.title}</h2>
        <p className="mt-0.5 line-clamp-2 text-[13px] leading-5 text-ink-faint">{suggestion.description}</p>
      </div>
    </motion.article>
  );
}

function SuggestionArtwork({ suggestion }: { suggestion: StyleSuggestion }) {
  const colors = [...(suggestion.palette ?? []), "#d8d2c6", "#6f7c70", "#2f332f", "#faf7f2"].slice(0, 5);
  if (suggestion.imageUrl) {
    return (
      <div className="relative min-h-0 flex-1 overflow-hidden bg-sand">
        <img src={suggestion.imageUrl} alt={`${suggestion.title} inspiration`} loading="eager" decoding="sync" fetchPriority="high" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/35" />
        {suggestion.imageCredit && (
          <span className="absolute bottom-3 right-3 text-[9px] font-medium text-white/80">{suggestion.imageCredit}</span>
        )}
      </div>
    );
  }
  return (
    <div
      role="img"
      aria-label={`${suggestion.title} category artwork`}
      className="relative min-h-0 flex-1 overflow-hidden"
      style={{
        backgroundColor: colors[0],
        backgroundImage: `radial-gradient(circle at 74% 28%, ${colors[3]} 0 13%, transparent 14%), linear-gradient(145deg, transparent 0 42%, ${colors[1]} 43% 68%, ${colors[2]} 69% 100%)`,
      }}
    >
      <span className="absolute -bottom-[17%] -left-[9%] block aspect-square w-[63%] rotate-12 rounded-[30%] border border-white/50" style={{ backgroundColor: colors[4], opacity: .36 }} />
      <span className="absolute right-[9%] top-[9%] text-[11px] font-semibold tracking-[0.04em] text-white/80">{suggestion.source === "photo" ? "PHOTO-TUNED" : "STARTER"}</span>
    </div>
  );
}
