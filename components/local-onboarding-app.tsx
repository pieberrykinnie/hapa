"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { BillingReadiness } from "@/components/billing/BillingReadiness";
import { ProfileSetup } from "@/components/onboarding/ProfileSetup";
import { ThisYouDeck } from "@/components/onboarding/ThisYouDeck";
import { getBillingReadiness } from "@/lib/onboarding/billing";
import {
  loadLocalOnboarding,
  aggregateVisualProfile,
  MAX_LOCAL_PHOTOS,
  prepareLocalPhoto,
  resetLocalOnboarding,
  saveLocalOnboarding,
  shouldReplayOnboarding,
  suggestionsForVisualProfile,
  type LocalPhoto,
  type LocalOnboardingState,
} from "@/lib/onboarding/local-store";
import { buildStyleProfile } from "@/lib/onboarding/rules";
import type { BillingMethod, BillingProvider, PaymentMethodId, StyleDNA, StyleSuggestion, SuggestionDecision } from "@/lib/types";

const PROVIDERS: Record<PaymentMethodId, BillingProvider> = {
  apple_pay: "applepay",
  google_pay: "gpay",
  paypal: "paypal",
  affirm: "affirm",
  card: "card",
};

const LABELS: Record<PaymentMethodId, string> = {
  apple_pay: "Apple Pay preference",
  google_pay: "Google Pay preference",
  paypal: "PayPal preference",
  affirm: "Affirm preference",
  card: "Card preference",
};

export function LocalOnboardingApp() {
  const [state, setState] = useState<LocalOnboardingState | null>(null);
  const stateRef = useRef<LocalOnboardingState | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const url = new URL(window.location.href);
      if (shouldReplayOnboarding(url.search)) {
        resetLocalOnboarding();
        url.searchParams.delete("onboarding");
        window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
      }
      const loaded = loadLocalOnboarding();
      stateRef.current = loaded;
      setState(loaded);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function persist(next: LocalOnboardingState) {
    const saved = saveLocalOnboarding(next);
    stateRef.current = saved;
    setState(saved);
    return saved;
  }

  async function finishProfile(name: string, files: File[]) {
    const current = stateRef.current;
    if (!current) return;
    const prepared: LocalPhoto[] = [];
    for (const file of files) prepared.push(await prepareLocalPhoto(file));
    const photos = mergePhotos(current.photos, prepared);
    const visualProfile = aggregateVisualProfile(photos);
    persist({
      ...current,
      stage: "this_you",
      displayName: name,
      photos,
      visualProfile,
      suggestions: suggestionsForVisualProfile(visualProfile),
      decisions: {},
      styleProfile: null,
    });
  }

  function removePhoto(id: string) {
    const current = stateRef.current;
    if (!current) return;
    const photos = current.photos.filter((photo) => photo.id !== id);
    const visualProfile = aggregateVisualProfile(photos);
    persist({ ...current, photos, visualProfile, suggestions: suggestionsForVisualProfile(visualProfile), decisions: {}, styleProfile: null });
  }

  function decide(suggestion: StyleSuggestion, decision: SuggestionDecision) {
    const current = stateRef.current;
    if (!current) return { complete: false, summary: null };
    const decisions = { ...current.decisions, [suggestion.id]: decision };
    const complete = current.suggestions.every((item) => decisions[item.id]);
    const styleProfile = complete
      ? buildStyleProfile(current.suggestions.map((item) => ({ suggestion: item, decision: decisions[item.id] })))
      : current.styleProfile;
    persist({ ...current, decisions, styleProfile });
    const categories = styleProfile?.activeCategories ?? [];
    return {
      complete,
      summary: complete
        ? categories.length
          ? `Your vibe: ${categories.join(", ")}.`
          : "Your exclusions are locked in. We’ll keep exploring."
        : null,
    };
  }

  function advanceToBilling() {
    const current = stateRef.current;
    if (current) persist({ ...current, stage: "billing" });
  }

  function finishBilling(method: PaymentMethodId | null, deferred: boolean) {
    const current = stateRef.current;
    if (current) persist({ ...current, stage: "complete", preferredPaymentMethod: method, billingDeferred: deferred });
  }

  const dna = useMemo<StyleDNA | null>(() => {
    if (!state?.styleProfile) return null;
    return {
      name: state.displayName,
      likes: [...state.styleProfile.activeCategories, ...Object.keys(state.styleProfile.positiveAttributes)],
      dealbreakers: state.styleProfile.exclusions,
      vibeHistory: [],
    };
  }, [state]);

  const billing = useMemo<BillingMethod | null>(() => {
    const method = state?.preferredPaymentMethod;
    return method ? { provider: PROVIDERS[method], label: LABELS[method], connectedAt: state.updatedAt } : null;
  }, [state]);

  if (!state) {
    return <main className="mx-auto flex min-h-dvh max-w-[430px] items-center justify-center bg-paper"><div className="skeleton size-14 rounded-frame" /><span className="sr-only">Loading local profile</span></main>;
  }
  if (state.stage === "profile") {
    return <ProfileSetup initialName={state.displayName} photos={state.photos} onContinue={finishProfile} onRemovePhoto={removePhoto} />;
  }
  if (state.stage === "this_you") {
    return <ThisYouDeck key={state.suggestions.map((item) => item.id).join("|")} suggestions={state.suggestions} decisions={state.decisions} visualProfile={state.visualProfile} onDecision={decide} onComplete={advanceToBilling} />;
  }
  if (state.stage === "billing") {
    return <BillingReadiness methods={getBillingReadiness()} preferredMethod={state.preferredPaymentMethod} onFinish={finishBilling} />;
  }
  if (!dna) return null;
  return <AppShell initialDNA={dna} initialBilling={billing} />;
}

function mergePhotos(existing: LocalPhoto[], incoming: LocalPhoto[]): LocalPhoto[] {
  const photos = new Map(existing.map((photo) => [photo.id, photo]));
  for (const photo of incoming) photos.set(photo.id, photo);
  return [...photos.values()].slice(0, MAX_LOCAL_PHOTOS);
}
