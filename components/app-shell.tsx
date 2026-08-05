"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Product } from "@/lib/types";
import { Feed } from "./feed";
import { HapaProvider, useHapa } from "./hapa-provider";
import { Onboarding } from "./onboarding";
import { ProductPage } from "./product-page";
import { RedirectOverlay } from "./redirect-overlay";
import { VoiceOverlay } from "./voice-overlay";

export function AppShell() {
  return (
    <HapaProvider>
      <div className="relative mx-auto h-dvh max-w-[430px] overflow-hidden bg-paper">
        <Screens />
      </div>
    </HapaProvider>
  );
}

function Screens() {
  const { screen } = useHapa();
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [opened, setOpened] = useState<{
    product: Product;
    layoutKey: string;
  } | null>(null);
  const [buying, setBuying] = useState<Product | null>(null);

  if (screen === "onboarding") return <Onboarding />;

  if (screen === "building") {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-5 bg-paper">
        <motion.div
          className="size-14 rounded-frame bg-pine"
          animate={{ rotate: [0, 90, 90, 180, 180], scale: [1, 0.85, 1, 0.85, 1] }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        />
        <span className="font-display text-base font-semibold text-ink">
          Building your vibe…
        </span>
      </div>
    );
  }

  return (
    <>
      <Feed
        onOpenProduct={(product, layoutKey) => setOpened({ product, layoutKey })}
        onBuy={setBuying}
        onOpenVoice={() => setVoiceOpen(true)}
      />
      <AnimatePresence>
        {opened && (
          <ProductPage
            key={opened.layoutKey}
            product={opened.product}
            layoutKey={opened.layoutKey}
            onBack={() => setOpened(null)}
            onBuy={() => setBuying(opened.product)}
          />
        )}
        {voiceOpen && (
          <VoiceOverlay key="voice" onClose={() => setVoiceOpen(false)} />
        )}
        {buying && (
          <RedirectOverlay
            key="redirect"
            product={buying}
            onDone={() => setBuying(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
