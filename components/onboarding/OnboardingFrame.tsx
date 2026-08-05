import type { ReactNode } from "react";

export function OnboardingFrame({ step, title, description, children }: { step: number; title: string; description: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex h-dvh w-full max-w-[440px] flex-col overflow-hidden bg-paper">
      <header className="flex shrink-0 flex-col gap-1.5 px-7 pt-[calc(env(safe-area-inset-top)+20px)]">
        <div className="flex items-center justify-between">
          <span className="hapa-wordmark text-[16px] text-pine">HAPA</span>
          <span className="sr-only">Step {step} of 3</span>
        </div>
        <h1 className="font-display text-[28px] font-bold leading-[1.15] tracking-[-0.03em] text-ink">{title}</h1>
        <p className="text-[16px] leading-6 text-ink-soft">{description}</p>
      </header>
      {children}
    </main>
  );
}
