"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { BillingProvider } from "@/lib/types";
import { useHapa } from "./hapa-provider";
import { HapaWordmark } from "./hapa-logo";

const PROVIDERS: {
  id: BillingProvider;
  name: string;
  sub: string;
  mark: string;
}[] = [
  { id: "applepay", name: "Apple Pay", sub: "Double-click to confirm", mark: "A" },
  { id: "gpay", name: "Google Pay", sub: "Pay with your saved cards", mark: "G" },
  { id: "paypal", name: "PayPal", sub: "Pay with your balance", mark: "P" },
  { id: "affirm", name: "Affirm", sub: "Split it over 4 payments", mark: "A" },
];

export function OnboardingBilling() {
  const { dna, connectBilling } = useHapa();
  const [connecting, setConnecting] = useState<BillingProvider | null>(null);

  const pick = (provider: BillingProvider) => {
    if (connecting) return;
    setConnecting(provider);
    // stands in for the provider's hosted connect sheet
    window.setTimeout(() => connectBilling(provider), 900);
  };

  return (
    <div className="flex h-dvh flex-col bg-paper">
      <header className="flex flex-col gap-2 px-7 pt-[calc(env(safe-area-inset-top)+20px)]">
        <HapaWordmark />
        <h1 className="font-display text-[28px] font-extrabold leading-[1.15] tracking-[-0.02em] text-ink">
          {dna.name ? `Last thing, ${dna.name}.` : "Last thing."}
        </h1>
        <p className="text-[14.5px] text-ink-soft">
          Connect how you pay, and hapa can check out for you — you approve
          every purchase first.
        </p>
      </header>

      <div className="flex flex-1 flex-col gap-3 px-7 pt-7">
        {PROVIDERS.map((p) => {
          const busy = connecting === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => pick(p.id)}
              disabled={connecting !== null}
              className={`flex items-center gap-3.5 rounded-card border bg-card px-4 py-4 text-left transition-colors ${
                busy ? "border-pine" : "border-line"
              } disabled:opacity-60`}
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-frame bg-sand font-display text-base font-bold text-ink-soft">
                {p.mark}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[15px] font-bold text-ink">
                  {p.name}
                </span>
                <span className="block text-[13px] text-ink-soft">{p.sub}</span>
              </span>
              {busy ? (
                <motion.span
                  className="size-4 shrink-0 rounded-full border-2 border-line border-t-pine"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
                />
              ) : (
                <span className="shrink-0 text-ink-faint">→</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="shrink-0 px-7 pb-[calc(env(safe-area-inset-bottom)+28px)] pt-4">
        <p className="text-center text-[11.5px] leading-relaxed text-ink-faint">
          Demo build — connecting is simulated. No card details are collected or
          stored, and no real payment is made.
        </p>
      </div>
    </div>
  );
}
