"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { parseVibeText } from "@/lib/vibe-parser";
import { useHapa } from "./hapa-provider";

export function TextVibeOverlay({ onClose }: { onClose: () => void }) {
  const { applyVibeShift } = useHapa();
  const [value, setValue] = useState("");

  const shift = parseVibeText(value);

  const submit = () => {
    if (!shift) return;
    applyVibeShift(shift);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 48 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 48 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="absolute inset-0 z-30 flex flex-col bg-ink"
    >
      <div className="flex items-center justify-between px-7 pt-[calc(env(safe-area-inset-top)+20px)]">
        <span className="font-display text-[15px] font-bold text-paper">
          Type your vibe
        </span>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="flex size-[34px] items-center justify-center rounded-full border-[1.5px] border-line-dark text-[15px] text-ink-faint"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-4 px-7">
        <p className="text-[14.5px] leading-relaxed text-paper-dim">
          Vibe, place, weather — whatever&apos;s on your mind. Separate ideas
          with commas, and start one with &quot;no&quot; to rule it out.
        </p>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Camping in Squamish, rain, no neon or RGB"
          rows={4}
          autoFocus
          className="rounded-2xl border border-line-dark bg-bubble px-4 py-3.5 text-[15px] leading-relaxed text-paper outline-none placeholder:text-ink-faint focus:border-pine"
        />
      </div>

      <div className="flex flex-col gap-3 px-7 pb-[calc(env(safe-area-inset-bottom)+40px)]">
        <button
          type="button"
          onClick={submit}
          disabled={!shift}
          className="w-full rounded-full bg-pine py-[17px] font-display text-base font-bold text-paper transition-opacity disabled:opacity-35"
        >
          Update my feed
        </button>
      </div>
    </motion.div>
  );
}
