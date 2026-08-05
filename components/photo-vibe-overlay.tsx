"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { VibeShift } from "@/lib/types";
import { useHapa } from "./hapa-provider";
import { PhotoIcon } from "./icons";

// Stands in for real vision analysis (see SPEC.md §6.3) — the demo has no
// vision model wired up, so a photo always reads as this plausible shift.
const PHOTO_DEMO_SHIFT: VibeShift = {
  add_keywords: ["earth-tones", "vintage"],
  remove_keywords: [],
  dealbreakers: ["neon"],
};
const READING_MS = 1600;

export function PhotoVibeOverlay({ onClose }: { onClose: () => void }) {
  const { applyVibeShift } = useHapa();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<{ url: string; name: string } | null>(
    null,
  );
  const [reading, setReading] = useState(false);

  // the object URL is only ever held client-side and is revoked on swap/unmount
  useEffect(() => {
    return () => {
      if (photo) URL.revokeObjectURL(photo.url);
    };
  }, [photo]);

  const pick = (file: File) => {
    if (photo) URL.revokeObjectURL(photo.url);
    setPhoto({ url: URL.createObjectURL(file), name: file.name });
  };

  const submit = () => {
    if (!photo || reading) return;
    setReading(true);
    window.setTimeout(() => {
      applyVibeShift(PHOTO_DEMO_SHIFT);
      onClose();
    }, READING_MS);
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
          Show hapa a vibe
        </span>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          disabled={reading}
          className="flex size-[34px] items-center justify-center rounded-full border-[1.5px] border-line-dark text-[15px] text-ink-faint disabled:opacity-40"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-5 px-7">
        {reading ? (
          <div className="flex flex-col items-center gap-4">
            <motion.span
              className="size-14 rounded-full border-4 border-bubble border-t-pine"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
            />
            <p className="text-center text-[14.5px] text-paper-dim">
              Reading your photo for colors, textures, and style…
            </p>
          </div>
        ) : (
          <>
            <p className="text-[14.5px] leading-relaxed text-paper-dim">
              A screenshot, a saved pic, anything with the look you want more
              of. hapa reads the vibe — not who&apos;s in it.
            </p>

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-line-dark bg-bubble"
            >
              {photo ? (
                <img
                  src={photo.url}
                  alt="Selected vibe photo"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex flex-col items-center gap-2 text-ink-faint">
                  <PhotoIcon size={28} color="#918a89" />
                  <span className="text-[13px] font-semibold">
                    Tap to choose a photo
                  </span>
                </span>
              )}
            </button>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) pick(file);
                e.target.value = "";
              }}
            />
          </>
        )}
      </div>

      <div className="flex flex-col gap-3 px-7 pb-[calc(env(safe-area-inset-bottom)+40px)]">
        <button
          type="button"
          onClick={submit}
          disabled={!photo || reading}
          className="w-full rounded-full bg-pine py-[17px] font-display text-base font-bold text-paper transition-opacity disabled:opacity-35"
        >
          {reading ? "Reading…" : "Update my feed"}
        </button>
      </div>
    </motion.div>
  );
}
