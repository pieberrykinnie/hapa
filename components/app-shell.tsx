"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Product } from "@/lib/types";
import { Feed } from "./feed";
import { HapaProvider, useHapa } from "./hapa-provider";
import { Onboarding } from "./onboarding";
import { OnboardingBilling } from "./onboarding-billing";
import { OnboardingIdentity } from "./onboarding-identity";
import { ProductPage } from "./product-page";
import { PurchaseFlow } from "./purchase-flow";
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
  const { screen, dna, order, requestPurchase } = useHapa();
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [opened, setOpened] = useState<{
    product: Product;
    layoutKey: string;
  } | null>(null);

  if (screen === "identity") return <OnboardingIdentity />;
  if (screen === "swipe") return <Onboarding />;
  if (screen === "billing") return <OnboardingBilling />;

  if (screen === "building") {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-5 bg-paper">
        <motion.div
          className="size-14 rounded-frame bg-pine"
          animate={{ rotate: [0, 90, 90, 180, 180], scale: [1, 0.85, 1, 0.85, 1] }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        />
        <span className="font-display text-base font-semibold text-ink">
          {dna.name ? `Building your vibe, ${dna.name}…` : "Building your vibe…"}
        </span>
      </div>
    );
  }

  return (
    <>
      <Feed
        onOpenProduct={(product, layoutKey) => setOpened({ product, layoutKey })}
        onBuy={requestPurchase}
        onOpenVoice={() => setVoiceOpen(true)}
      />
      <AnimatePresence>
        {opened && (
          <ProductPage
            key={opened.layoutKey}
            product={opened.product}
            layoutKey={opened.layoutKey}
            onBack={() => setOpened(null)}
            onBuy={() => requestPurchase(opened.product)}
          />
        )}
        {voiceOpen && (
          <VoiceOverlay key="voice" onClose={() => setVoiceOpen(false)} />
        )}
        {order && <PurchaseFlow key="purchase" />}
      </AnimatePresence>
    </>
  );
}
