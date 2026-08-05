"use client";

/* eslint-disable @next/next/no-img-element */
import { useRef } from "react";
import { motion } from "framer-motion";
import { useHapa } from "./hapa-provider";

export function OnboardingIdentity() {
  const { dna, vibeImages, setName, addVibeImages, removeVibeImage, finishIdentity } =
    useHapa();
  const fileRef = useRef<HTMLInputElement>(null);
  const ready = dna.name.trim().length > 0;

  return (
    <div className="flex h-dvh flex-col bg-paper">
      <header className="flex flex-col gap-1.5 px-7 pt-[calc(env(safe-area-inset-top)+20px)]">
        <span className="font-display text-[15px] font-bold tracking-[-0.01em] text-pine">
          hapa
        </span>
        <h1 className="font-display text-[28px] font-extrabold leading-[1.15] tracking-[-0.02em] text-ink">
          Who&apos;s shopping?
        </h1>
        <p className="text-[14.5px] text-ink-soft">
          A name and a few things you like. That&apos;s the whole setup.
        </p>
      </header>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-7 pt-7">
        <label className="flex flex-col gap-2">
          <span className="font-display text-[13px] font-semibold text-ink-soft">
            First name
          </span>
          <input
            value={dna.name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Peter"
            autoComplete="given-name"
            className="rounded-2xl border border-line bg-card px-4 py-3.5 text-[15px] text-ink outline-none placeholder:text-ink-faint focus:border-pine"
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="font-display text-[13px] font-semibold text-ink-soft">
            Drop in some vibes
          </span>
          <p className="-mt-1 text-[13px] text-ink-faint">
            Screenshots, saved pics, anything you&apos;d want more of. Optional.
          </p>

          <div className="mt-1 grid grid-cols-3 gap-2.5">
            {vibeImages.map((img) => (
              <motion.div
                key={img.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative aspect-square overflow-hidden rounded-frame border border-line bg-sand"
              >
                <img
                  src={img.url}
                  alt={img.name}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  aria-label={`Remove ${img.name}`}
                  onClick={() => removeVibeImage(img.id)}
                  className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-ink/70 text-xs text-paper"
                >
                  ✕
                </button>
              </motion.div>
            ))}

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-frame border border-dashed border-line bg-card text-ink-faint"
            >
              <span className="text-2xl leading-none">+</span>
              <span className="text-[11px] font-semibold">Add</span>
            </button>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length) addVibeImages(files);
              e.target.value = "";
            }}
          />
          <p className="text-[11.5px] text-ink-faint">
            Photos stay on your device — nothing is uploaded.
          </p>
        </div>
      </div>

      <div className="shrink-0 px-7 pb-[calc(env(safe-area-inset-bottom)+28px)] pt-4">
        <button
          type="button"
          disabled={!ready}
          onClick={finishIdentity}
          className="w-full rounded-full bg-ink py-[17px] font-display text-base font-bold text-paper transition-opacity disabled:opacity-35"
        >
          Next
        </button>
      </div>
    </div>
  );
}
