"use client";

import { useState } from "react";
import type { PaymentMethodId, PaymentMethodReadiness } from "@/lib/types";
import { OnboardingFrame } from "@/components/onboarding/OnboardingFrame";
import { PaymentMethodIcon } from "./PaymentMethodIcon";

export function BillingReadiness({
  methods,
  preferredMethod,
  onFinish,
}: {
  methods: PaymentMethodReadiness[];
  preferredMethod: PaymentMethodId | null;
  onFinish: (method: PaymentMethodId | null, deferred: boolean) => void;
}) {
  const [selected, setSelected] = useState<PaymentMethodId | null>(preferredMethod);
  const [error, setError] = useState<string | null>(null);

  function finish(defer: boolean) {
    if (!defer && !selected) return setError("Pick a preference or set it up later.");
    setError(null);
    try {
      onFinish(defer ? null : selected, defer);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save your preference on this device.");
    }
  }

  return (
    <OnboardingFrame step={3} title="How do you want HAPA to pay?" description="We’ll prepare the order. You always approve the total.">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-7 pt-7">
          {methods.map((method) => {
            const chosen = selected === method.id;
            return (
              <button
                key={method.id}
                type="button"
                onClick={() => setSelected(method.id)}
                className={`flex items-center gap-3.5 rounded-card border bg-card px-4 py-3.5 text-left transition-colors ${chosen ? "border-pine" : "border-line"}`}
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-frame bg-sand text-ink-soft"><PaymentMethodIcon method={method.id} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-bold text-ink">{method.name}</span>
                  <span className="mt-0.5 block text-[13px] leading-5 text-ink-soft">{method.reason}</span>
                </span>
                <span className={`shrink-0 text-[12px] font-semibold tracking-[0.04em] ${chosen ? "text-pine" : "text-ink-faint"}`}>{chosen ? "Preferred" : "Choose"}</span>
              </button>
            );
          })}
          {error && <p role="alert" className="text-center text-[13px] text-red-800">{error}</p>}
        </div>

        <div className="shrink-0 px-7 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-4">
          <button disabled={!selected} onClick={() => finish(false)} className="w-full rounded-full bg-ink py-[17px] text-[15px] font-bold text-paper transition-opacity disabled:opacity-35">Start swiping</button>
          <button onClick={() => finish(true)} className="mt-2 w-full py-2 text-[13px] font-semibold text-ink-soft">Set up later</button>
          <p className="mt-1 text-center text-[11.5px] text-ink-faint">Preference only. No payment details are stored.</p>
        </div>
      </div>
    </OnboardingFrame>
  );
}
