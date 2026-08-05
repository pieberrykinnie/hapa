"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useHapa } from "./hapa-provider";
import { MicIcon } from "./icons";

// Scripted demo exchange — replaced by the live Vapi transcript once the
// assistant + `shift_feed_vibe` tool are wired to real keys.
const USER_LINE =
  "“Bored of desk stuff. I’m camping in Squamish this weekend and it’ll rain — switch to outdoor gear, muted colors, nothing neon.”";
const HAPA_LINE =
  "Say less. Ditching the desk gear — pulling up earth-tone, waterproof camping essentials.";
const DEMO_SHIFT = {
  add_keywords: ["camping", "waterproof"],
  remove_keywords: ["desk"],
  dealbreakers: ["neon"],
};

const BAR_HEIGHTS = [20, 44, 60, 34, 52, 24, 40];

export function VoiceOverlay({ onClose }: { onClose: () => void }) {
  const { applyVibeShift } = useHapa();
  // 0 = listening · 1 = user spoke · 2 = hapa replied · 3 = feed updating
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setStep(1), 1400),
      window.setTimeout(() => setStep(2), 3200),
      window.setTimeout(() => setStep(3), 4200),
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  const close = () => {
    // leaving early still commits the shift once hapa has replied
    if (step >= 2) applyVibeShift(DEMO_SHIFT);
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
          hapa is listening
        </span>
        <button
          type="button"
          aria-label="Close"
          onClick={close}
          className="flex size-[34px] items-center justify-center rounded-full border-[1.5px] border-line-dark text-[15px] text-ink-faint"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-7 px-7">
        {/* waveform — animates while "listening" */}
        <div className="flex h-16 items-end justify-center gap-[5px]">
          {BAR_HEIGHTS.map((h, i) => (
            <span
              key={i}
              className="wave-bar w-1.5 rounded-[3px]"
              style={{
                height: h,
                background: i === 2 || i === 4 ? "#c8e087" : "#3f7d20",
                animationDelay: `${i * 0.12}s`,
                animationPlayState: step === 3 ? "paused" : "running",
              }}
            />
          ))}
        </div>

        <div className="flex min-h-[220px] flex-col gap-3.5">
          <AnimatePresence>
            {step >= 1 && (
              <motion.div
                key="user"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-[280px] self-end rounded-[18px] rounded-br-[4px] bg-bubble px-4 py-3.5 text-[14.5px] leading-normal text-paper"
              >
                {USER_LINE}
              </motion.div>
            )}
            {step >= 2 && (
              <motion.div
                key="hapa"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-[280px] self-start rounded-[18px] rounded-bl-[4px] bg-pine px-4 py-3.5 text-[14.5px] leading-normal text-paper"
              >
                {HAPA_LINE}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 px-7 pb-[calc(env(safe-area-inset-bottom)+40px)]">
        <AnimatePresence>
          {step >= 3 && (
            <motion.div
              key="toast"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-bubble px-4 py-2.5"
            >
              <span className="text-[13px] font-medium text-paper-dim">
                Updating your feed: more camping &amp; waterproof · less neon
                &amp; desk
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          type="button"
          aria-label="Done talking"
          onClick={close}
          className="flex size-[62px] items-center justify-center rounded-full bg-pine"
        >
          <MicIcon size={26} color="#f7f5ee" />
        </button>
      </div>
    </motion.div>
  );
}
