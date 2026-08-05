"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  STEP_MS,
  buildSteps,
  makeOrderRef,
} from "@/lib/purchase-agent";
import type {
  BillingMethod,
  BillingProvider,
  FeedResponse,
  Order,
  Product,
  StyleDNA,
  VibeImage,
  VibeShift,
} from "@/lib/types";

const DNA_STORAGE_KEY = "hapa.dna";
const BILLING_STORAGE_KEY = "hapa.billing";

export type Screen = "identity" | "swipe" | "billing" | "building" | "feed";

interface HapaContextValue {
  screen: Screen;
  dna: StyleDNA;
  vibeImages: VibeImage[];
  billing: BillingMethod | null;
  order: Order | null;
  items: Product[];
  activeCategory: string;
  status: "idle" | "loading" | "shifting";
  toast: string | null;
  setName: (name: string) => void;
  addVibeImages: (files: File[]) => void;
  removeVibeImage: (id: string) => void;
  finishIdentity: () => void;
  swipe: (tags: string[], liked: boolean, isLast: boolean) => void;
  connectBilling: (provider: BillingProvider) => void;
  setCategory: (category: string) => void;
  loadMore: () => void;
  applyVibeShift: (shift: VibeShift) => void;
  dismissToast: () => void;
  requestPurchase: (product: Product) => void;
  confirmPurchase: () => void;
  cancelPurchase: () => void;
}

const HapaContext = createContext<HapaContextValue | null>(null);

export function useHapa() {
  const ctx = useContext(HapaContext);
  if (!ctx) throw new Error("useHapa must be used within HapaProvider");
  return ctx;
}

const EMPTY_DNA: StyleDNA = {
  name: "",
  likes: [],
  dealbreakers: [],
  vibeHistory: [],
};

function loadJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function saveJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable — demo continues in memory
  }
}

export function HapaProvider({ children }: { children: ReactNode }) {
  const [screen, setScreen] = useState<Screen>("identity");
  const [dna, setDNA] = useState<StyleDNA>(EMPTY_DNA);
  const [vibeImages, setVibeImages] = useState<VibeImage[]>([]);
  const [billing, setBilling] = useState<BillingMethod | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState("for-you");
  const [status, setStatus] = useState<"idle" | "loading" | "shifting">("idle");
  const [toast, setToast] = useState<string | null>(null);
  const cursorRef = useRef<number | null>(0);
  const fetchIdRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const agentTimersRef = useRef<number[]>([]);

  const fetchFeed = useCallback(
    async (opts: {
      dna: StyleDNA;
      category: string;
      cursor: number;
      replace: boolean;
    }) => {
      const fetchId = ++fetchIdRef.current;
      const keywords =
        opts.category === "for-you" ? opts.dna.likes : [opts.category];
      const params = new URLSearchParams({
        keywords: keywords.join(","),
        exclude: opts.dna.dealbreakers.join(","),
        cursor: String(opts.cursor),
      });
      try {
        const res = await fetch(`/api/feed?${params}`);
        const data = (await res.json()) as FeedResponse;
        if (fetchId !== fetchIdRef.current) return; // stale response
        cursorRef.current = data.nextCursor;
        setItems((prev) => (opts.replace ? data.items : [...prev, ...data.items]));
      } catch {
        if (fetchId !== fetchIdRef.current) return;
      } finally {
        if (!opts.replace) loadingMoreRef.current = false;
        if (fetchId === fetchIdRef.current) setStatus("idle");
      }
    },
    [],
  );

  // Persisted taste survives a reload mid-demo; ?onboard=1 forces a fresh run.
  // Runs in an effect (not render) because localStorage doesn't exist during
  // SSR and the server HTML must hydrate cleanly before we switch screens.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("onboard")) {
      localStorage.removeItem(DNA_STORAGE_KEY);
      localStorage.removeItem(BILLING_STORAGE_KEY);
      return;
    }
    const storedDNA = loadJSON<StyleDNA>(DNA_STORAGE_KEY);
    const storedBilling = loadJSON<BillingMethod>(BILLING_STORAGE_KEY);
    /* Hydrating persisted state is exactly the "sync from an external system"
       case an effect is for — localStorage can't be read during SSR render. */
    /* eslint-disable react-hooks/set-state-in-effect */
    if (storedBilling) setBilling(storedBilling);
    if (storedDNA && storedDNA.likes.length > 0 && storedBilling) {
      setDNA({ ...EMPTY_DNA, ...storedDNA });
      setScreen("feed");
      setStatus("loading");
      fetchFeed({
        dna: storedDNA,
        category: "for-you",
        cursor: 0,
        replace: true,
      });
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [fetchFeed]);

  // object URLs are revoked on unmount so uploads don't leak
  useEffect(() => {
    return () => {
      agentTimersRef.current.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  /* ── onboarding ──────────────────────────────────────────────────────── */

  const setName = useCallback((name: string) => {
    setDNA((prev) => {
      const next = { ...prev, name };
      saveJSON(DNA_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const addVibeImages = useCallback((files: File[]) => {
    const added = files.map((file) => ({
      id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`,
      url: URL.createObjectURL(file),
      name: file.name,
    }));
    setVibeImages((prev) => [...prev, ...added]);
  }, []);

  const removeVibeImage = useCallback((id: string) => {
    setVibeImages((prev) => {
      const hit = prev.find((v) => v.id === id);
      if (hit) URL.revokeObjectURL(hit.url);
      return prev.filter((v) => v.id !== id);
    });
  }, []);

  const finishIdentity = useCallback(() => setScreen("swipe"), []);

  const swipe = useCallback(
    (tags: string[], liked: boolean, isLast: boolean) => {
      setDNA((prev) => {
        const next: StyleDNA = liked
          ? { ...prev, likes: dedupe([...prev.likes, ...tags]) }
          : { ...prev, dealbreakers: dedupe([...prev.dealbreakers, ...tags]) };
        saveJSON(DNA_STORAGE_KEY, next);
        // billing is the last onboarding beat, then straight into the feed
        if (isLast) setScreen("billing");
        return next;
      });
    },
    [],
  );

  /**
   * Simulated provider connect. A real integration hands back exactly this
   * shape from a hosted flow — we never see or store the underlying card.
   */
  const connectBilling = useCallback(
    (provider: BillingProvider) => {
      const label =
        provider === "card"
          ? "Visa ·· 4242"
          : provider === "paypal"
            ? "PayPal"
            : "Affirm";
      const method: BillingMethod = {
        provider,
        label,
        connectedAt: new Date().toISOString(),
      };
      setBilling(method);
      saveJSON(BILLING_STORAGE_KEY, method);
      setScreen("building");
      setStatus("loading");
      setDNA((current) => {
        fetchFeed({
          dna: current,
          category: "for-you",
          cursor: 0,
          replace: true,
        });
        return current;
      });
      window.setTimeout(() => setScreen("feed"), 1200);
    },
    [fetchFeed],
  );

  /* ── feed ────────────────────────────────────────────────────────────── */

  const setCategory = useCallback(
    (category: string) => {
      setActiveCategory(category);
      setStatus("loading");
      setItems([]);
      fetchFeed({ dna, category, cursor: 0, replace: true });
    },
    [dna, fetchFeed],
  );

  const loadMore = useCallback(() => {
    if (status !== "idle" || cursorRef.current === null || loadingMoreRef.current)
      return;
    loadingMoreRef.current = true;
    fetchFeed({
      dna,
      category: activeCategory,
      cursor: cursorRef.current,
      replace: false,
    });
  }, [dna, activeCategory, status, fetchFeed]);

  // Voice tool handler: merge deltas into StyleDNA, build plain-language toast,
  // flush the feed and refetch. A decisive reset, not a reshuffle.
  const applyVibeShift = useCallback(
    (shift: VibeShift) => {
      setDNA((prev) => {
        const next: StyleDNA = {
          ...prev,
          likes: dedupe([
            ...prev.likes.filter((t) => !shift.remove_keywords.includes(t)),
            ...shift.add_keywords,
          ]),
          dealbreakers: dedupe([...prev.dealbreakers, ...shift.dealbreakers]),
          vibeHistory: [
            ...prev.vibeHistory,
            { label: shift.add_keywords.join(" & "), at: new Date().toISOString() },
          ],
        };
        saveJSON(DNA_STORAGE_KEY, next);
        const more = shift.add_keywords.join(" & ");
        const less = [...shift.dealbreakers, ...shift.remove_keywords].join(" & ");
        setToast(`Updating your feed: more ${more} · less ${less}`);
        setActiveCategory("for-you");
        setStatus("shifting");
        setItems([]);
        fetchFeed({ dna: next, category: "for-you", cursor: 0, replace: true });
        return next;
      });
    },
    [fetchFeed],
  );

  const dismissToast = useCallback(() => setToast(null), []);

  /* ── agentic checkout ────────────────────────────────────────────────── */

  // Buy now never pays directly — it opens a confirm step first, so a stray
  // tap on a scrolling feed can't spend money.
  const requestPurchase = useCallback((product: Product) => {
    setOrder({
      product,
      stage: "confirm",
      steps: [],
      orderRef: null,
      error: null,
    });
  }, []);

  const cancelPurchase = useCallback(() => {
    agentTimersRef.current.forEach((t) => window.clearTimeout(t));
    agentTimersRef.current = [];
    setOrder(null);
  }, []);

  const confirmPurchase = useCallback(() => {
    setOrder((prev) => {
      if (!prev || !billing) return prev;
      const labels = buildSteps(prev.product, billing);

      agentTimersRef.current.forEach((t) => window.clearTimeout(t));
      agentTimersRef.current = labels.map((_, i) =>
        window.setTimeout(
          () =>
            setOrder((o) =>
              o && o.stage === "working"
                ? {
                    ...o,
                    steps: o.steps.map((s, si) =>
                      si <= i ? { ...s, done: true } : s,
                    ),
                  }
                : o,
            ),
          STEP_MS * (i + 1),
        ),
      );
      agentTimersRef.current.push(
        window.setTimeout(
          () =>
            setOrder((o) =>
              o && o.stage === "working"
                ? { ...o, stage: "done", orderRef: makeOrderRef() }
                : o,
            ),
          STEP_MS * (labels.length + 0.6),
        ),
      );

      return {
        ...prev,
        stage: "working",
        steps: labels.map((label) => ({ label, done: false })),
      };
    });
  }, [billing]);

  const value = useMemo<HapaContextValue>(
    () => ({
      screen,
      dna,
      vibeImages,
      billing,
      order,
      items,
      activeCategory,
      status,
      toast,
      setName,
      addVibeImages,
      removeVibeImage,
      finishIdentity,
      swipe,
      connectBilling,
      setCategory,
      loadMore,
      applyVibeShift,
      dismissToast,
      requestPurchase,
      confirmPurchase,
      cancelPurchase,
    }),
    [
      screen,
      dna,
      vibeImages,
      billing,
      order,
      items,
      activeCategory,
      status,
      toast,
      setName,
      addVibeImages,
      removeVibeImage,
      finishIdentity,
      swipe,
      connectBilling,
      setCategory,
      loadMore,
      applyVibeShift,
      dismissToast,
      requestPurchase,
      confirmPurchase,
      cancelPurchase,
    ],
  );

  return <HapaContext.Provider value={value}>{children}</HapaContext.Provider>;
}

function dedupe(list: string[]): string[] {
  return Array.from(new Set(list));
}
