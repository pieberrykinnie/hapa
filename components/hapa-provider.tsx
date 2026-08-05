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
import type { FeedResponse, Product, StyleDNA, VibeShift } from "@/lib/types";

const DNA_STORAGE_KEY = "hapa.dna";

export type Screen = "onboarding" | "building" | "feed";

interface HapaContextValue {
  screen: Screen;
  dna: StyleDNA;
  items: Product[];
  activeCategory: string;
  status: "idle" | "loading" | "shifting";
  toast: string | null;
  swipe: (tags: string[], liked: boolean, isLast: boolean) => void;
  setCategory: (category: string) => void;
  loadMore: () => void;
  applyVibeShift: (shift: VibeShift) => void;
  dismissToast: () => void;
}

const HapaContext = createContext<HapaContextValue | null>(null);

export function useHapa() {
  const ctx = useContext(HapaContext);
  if (!ctx) throw new Error("useHapa must be used within HapaProvider");
  return ctx;
}

const EMPTY_DNA: StyleDNA = { likes: [], dealbreakers: [], vibeHistory: [] };

function loadDNA(): StyleDNA | null {
  try {
    const raw = localStorage.getItem(DNA_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StyleDNA) : null;
  } catch {
    return null;
  }
}

function saveDNA(dna: StyleDNA) {
  try {
    localStorage.setItem(DNA_STORAGE_KEY, JSON.stringify(dna));
  } catch {
    // storage unavailable — demo continues in memory
  }
}

export function HapaProvider({ children }: { children: ReactNode }) {
  const [screen, setScreen] = useState<Screen>("onboarding");
  const [dna, setDNA] = useState<StyleDNA>(EMPTY_DNA);
  const [items, setItems] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState("for-you");
  const [status, setStatus] = useState<"idle" | "loading" | "shifting">("idle");
  const [toast, setToast] = useState<string | null>(null);
  const cursorRef = useRef<number | null>(0);
  const fetchIdRef = useRef(0);

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
      return;
    }
    const stored = loadDNA();
    if (stored && stored.likes.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDNA(stored);
      setScreen("feed");
      setStatus("loading");
      fetchFeed({ dna: stored, category: "for-you", cursor: 0, replace: true });
    }
  }, [fetchFeed]);

  const swipe = useCallback(
    (tags: string[], liked: boolean, isLast: boolean) => {
      setDNA((prev) => {
        const next: StyleDNA = liked
          ? { ...prev, likes: dedupe([...prev.likes, ...tags]) }
          : { ...prev, dealbreakers: dedupe([...prev.dealbreakers, ...tags]) };
        saveDNA(next);
        if (isLast) {
          setScreen("building");
          setStatus("loading");
          fetchFeed({ dna: next, category: "for-you", cursor: 0, replace: true });
          // brief "building your vibe" moment, then straight into the feed
          window.setTimeout(() => setScreen("feed"), 1200);
        }
        return next;
      });
    },
    [fetchFeed],
  );

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
    if (status !== "idle" || cursorRef.current === null) return;
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
        saveDNA(next);
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

  const value = useMemo<HapaContextValue>(
    () => ({
      screen,
      dna,
      items,
      activeCategory,
      status,
      toast,
      swipe,
      setCategory,
      loadMore,
      applyVibeShift,
      dismissToast,
    }),
    [
      screen,
      dna,
      items,
      activeCategory,
      status,
      toast,
      swipe,
      setCategory,
      loadMore,
      applyVibeShift,
      dismissToast,
    ],
  );

  return <HapaContext.Provider value={value}>{children}</HapaContext.Provider>;
}

function dedupe(list: string[]): string[] {
  return Array.from(new Set(list));
}
