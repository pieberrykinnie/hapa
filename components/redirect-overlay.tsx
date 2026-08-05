"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import type { Product } from "@/lib/types";

const REDIRECT_DELAY_MS = 1100;

export function RedirectOverlay({
  product,
  onDone,
}: {
  product: Product;
  onDone: () => void;
}) {
  useEffect(() => {
    const t = window.setTimeout(() => {
      // popup blockers may reject window.open outside a user gesture —
      // fall back to same-tab navigation so the buy always lands
      const win = window.open(product.link, "_blank", "noopener");
      if (!win) window.location.assign(product.link);
      onDone();
    }, REDIRECT_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [product, onDone]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-6 bg-paper"
    >
      <div className="flex items-center gap-4">
        <div className="flex size-14 items-center justify-center rounded-frame bg-pine font-display text-[22px] font-extrabold text-paper">
          h
        </div>
        <span className="text-base text-ink-faint">→</span>
        <div className="flex size-14 items-center justify-center rounded-frame border-[1.5px] border-line bg-card text-xs font-bold text-ink-faint">
          {product.merchant}
        </div>
      </div>
      <div className="px-12 text-center">
        <h2 className="font-display text-2xl font-extrabold tracking-[-0.02em] text-ink">
          Taking you to {product.merchant}
        </h2>
        <p className="mt-2 text-[14.5px] leading-[1.55] text-ink-soft">
          Real product, real link, real checkout. We&apos;ll keep your vibe
          warm.
        </p>
      </div>
      <div className="flex gap-[5px]">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-2 rounded-full"
            initial={{ background: "#e0dacd" }}
            animate={{ background: ["#e0dacd", "#3d6b4f", "#e0dacd"] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.3 }}
          />
        ))}
      </div>
    </motion.div>
  );
}
