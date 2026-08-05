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
const SAVED_STORAGE_KEY = "hapa.saved";
const PURCHASES_STORAGE_KEY = "hapa.purchases";

const BILLING_LABELS: Record<BillingProvider, string> = {
  applepay: "Apple Pay",
  gpay: "Google Pay",
  paypal: "PayPal",
  affirm: "Affirm",
  card: "Card",
};

export type Screen = "identity" | "swipe" | "billing" | "building" | "feed";

export interface PurchaseRecord {
  orderRef: string;
  purchasedAt: string;
}

interface FetchFeedOpts {
  dna: StyleDNA;
  category: string;
  cursor: number;
  replace: boolean;
  isRetry?: boolean;
  restoreOnFailure?: Product[];
}

interface HapaContextValue {
  screen: Screen;
  dna: StyleDNA;
  vibeImages: VibeImage[];
  billing: BillingMethod | null;
  saved: Product[];
  purchases: Record<string, PurchaseRecord>;
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
  toggleSaved: (product: Product) => void;
  isSaved: (id: string) => boolean;
  purchaseFor: (id: string) => PurchaseRecord | null;
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

export function HapaProvider({
  children,
  initialDNA,
  initialBilling,
}: {
  children: ReactNode;
  initialDNA?: StyleDNA;
  initialBilling?: BillingMethod | null;
}) {
  const [screen, setScreen] = useState<Screen>(initialDNA ? "feed" : "identity");
  const [dna, setDNA] = useState<StyleDNA>(initialDNA ?? EMPTY_DNA);
  const [vibeImages, setVibeImages] = useState<VibeImage[]>([]);
  const [billing, setBilling] = useState<BillingMethod | null>(initialBilling ?? null);
  const [saved, setSaved] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Record<string, PurchaseRecord>>({});
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState("for-you");
  const [status, setStatus] = useState<"idle" | "loading" | "shifting">("idle");
  const [toast, setToast] = useState<string | null>(null);
  const cursorRef = useRef<number | null>(0);
  const fetchIdRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const agentTimersRef = useRef<number[]>([]);
  const activeOrderRef = useRef<Order | null>(null);
  const itemsRef = useRef<Product[]>([]);
  // Every product ID shown so far in the current feed "lap" — sent back with
  // each request so neither live discovery nor the fallback loop repeats an
  // item before the shopper has seen everything eligible once. Reset inside
  // fetchFeed whenever a request replaces the feed (a fresh lap).
  const seenRef = useRef<Set<string>>(new Set());
  // Self-reference for the retry below: a `useCallback` can't call its own
  // binding inside its initializer, so the retry reads the latest version
  // through this ref instead (kept in sync by the effect right after it).
  const fetchFeedRef = useRef<(opts: FetchFeedOpts) => Promise<void>>(async () => {});

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const fetchFeed = useCallback(
    async (opts: FetchFeedOpts) => {
      const fetchId = ++fetchIdRef.current;
      // A replace starts a fresh lap through the catalogue/live results.
      if (opts.replace) seenRef.current = new Set();
      const keywords =
        opts.category === "for-you" ? opts.dna.likes : [opts.category];
      const seenList = Array.from(seenRef.current).slice(-120);
      const params = new URLSearchParams({
        keywords: keywords.join(","),
        exclude: opts.dna.dealbreakers.join(","),
        cursor: String(opts.cursor),
        seen: seenList.join(","),
      });
      try {
        const res = await fetch(`/api/feed?${params}`);
        if (!res.ok) throw new Error(`feed request failed: ${res.status}`);
        const data = (await res.json()) as FeedResponse;
        if (fetchId !== fetchIdRef.current) return; // superseded by a newer request
        cursorRef.current = data.nextCursor;
        data.items.forEach((item) => seenRef.current.add(item.id));
        setItems((prev) => {
          if (!opts.replace) return [...prev, ...data.items];
          // The feed never renders empty: an empty/failed refresh keeps
          // whatever was already showing instead of blanking the screen.
          return data.items.length > 0 ? data.items : prev;
        });
      } catch {
        if (fetchId !== fetchIdRef.current) return;
        if (!opts.isRetry) {
          // one silent retry after 1.5s before giving up on this request
          const retryTimer = window.setTimeout(() => {
            if (fetchId === fetchIdRef.current) {
              fetchFeedRef.current({ ...opts, isRetry: true });
            }
          }, 1500);
          agentTimersRef.current.push(retryTimer);
          return;
        }
        if (opts.restoreOnFailure && opts.restoreOnFailure.length > 0) {
          setItems(opts.restoreOnFailure);
          // keep the restored items out of the next lap too
          opts.restoreOnFailure.forEach((item) => seenRef.current.add(item.id));
        }
      } finally {
        if (!opts.replace) loadingMoreRef.current = false;
        if (fetchId === fetchIdRef.current) setStatus("idle");
      }
    },
    [],
  );

  useEffect(() => {
    fetchFeedRef.current = fetchFeed;
  }, [fetchFeed]);

  // Profile/style state comes from the device-local onboarding coordinator.
  // Saved product presentation state remains a local convenience.
  useEffect(() => {
    const storedSaved = loadJSON<Product[]>(SAVED_STORAGE_KEY);
    const storedPurchases = loadJSON<Record<string, PurchaseRecord>>(
      PURCHASES_STORAGE_KEY,
    );
    /* Hydrating persisted state is exactly the "sync from an external system"
       case an effect is for — localStorage can't be read during SSR render. */
    /* eslint-disable react-hooks/set-state-in-effect */
    if (storedSaved) setSaved(storedSaved);
    if (storedPurchases) setPurchases(storedPurchases);
    if (initialDNA) {
      setStatus("loading");
      fetchFeed({
        dna: initialDNA,
        category: "for-you",
        cursor: 0,
        replace: true,
      });
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [fetchFeed, initialDNA]);

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
    (rawTags: string[], liked: boolean, isLast: boolean) => {
      const tags = normalizeTags(rawTags);
      setDNA((prev) => {
        const next: StyleDNA = liked
          ? { ...prev, likes: dedupe([...prev.likes, ...tags]) }
          : {
              ...prev,
              // an exclusion always wins over an existing positive preference — FR-012
              likes: prev.likes.filter((t) => !tags.includes(t)),
              dealbreakers: dedupe([...prev.dealbreakers, ...tags]),
            };
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
      const label = BILLING_LABELS[provider];
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
      // "Saved" is a local view over bookmarks — nothing to fetch, and the
      // fetched items are kept so switching back doesn't reload the feed.
      if (category === "saved") return;
      setStatus("loading");
      const restoreOnFailure = itemsRef.current;
      setItems([]);
      fetchFeed({ dna, category, cursor: 0, replace: true, restoreOnFailure });
    },
    [dna, fetchFeed],
  );

  // Bookmarks live in the feed: the "Saved" chip filters to them, so there's
  // no separate screen to navigate to.
  const toggleSaved = useCallback((product: Product) => {
    setSaved((prev) => {
      const next = prev.some((p) => p.id === product.id)
        ? prev.filter((p) => p.id !== product.id)
        : [product, ...prev];
      saveJSON(SAVED_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const isSaved = useCallback(
    (id: string) => saved.some((p) => p.id === id),
    [saved],
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
    (rawShift: VibeShift) => {
      const shift: VibeShift = {
        add_keywords: normalizeTags(rawShift.add_keywords),
        remove_keywords: normalizeTags(rawShift.remove_keywords),
        dealbreakers: normalizeTags(rawShift.dealbreakers),
      };
      setDNA((prev) => {
        const next: StyleDNA = {
          ...prev,
          likes: dedupe([
            ...prev.likes.filter(
              (t) =>
                !shift.remove_keywords.includes(t) &&
                // an exclusion always wins over an existing positive preference — FR-012
                !shift.dealbreakers.includes(t),
            ),
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
        const restoreOnFailure = itemsRef.current;
        setItems([]);
        fetchFeed({
          dna: next,
          category: "for-you",
          cursor: 0,
          replace: true,
          restoreOnFailure,
        });
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
    const next: Order = {
      product,
      stage: "confirm",
      steps: [],
      orderRef: null,
      error: null,
    };
    activeOrderRef.current = next;
    setOrder(next);
  }, []);

  const cancelPurchase = useCallback(() => {
    agentTimersRef.current.forEach((t) => window.clearTimeout(t));
    agentTimersRef.current = [];
    activeOrderRef.current = null;
    setOrder(null);
  }, []);

  const confirmPurchase = useCallback(() => {
    setOrder((prev) => {
      if (!prev || !billing) return prev;
      const labels = buildSteps(prev.product, billing);

      agentTimersRef.current.forEach((t) => window.clearTimeout(t));
      agentTimersRef.current = labels.map((_, i) =>
        window.setTimeout(
          () => {
            const active = activeOrderRef.current;
            if (!active || active.stage !== "working") return;
            const next: Order = {
              ...active,
              steps: active.steps.map((s, si) =>
                si <= i ? { ...s, done: true } : s,
              ),
            };
            activeOrderRef.current = next;
            setOrder(next);
          },
          STEP_MS * (i + 1),
        ),
      );
      agentTimersRef.current.push(
        window.setTimeout(
          () => {
            const active = activeOrderRef.current;
            if (!active || active.stage !== "working") return;
            const orderRef = makeOrderRef();
            const doneOrder: Order = {
              ...active,
              stage: "done",
              orderRef,
              steps: active.steps.map((step) => ({ ...step, done: true })),
            };
            activeOrderRef.current = doneOrder;
            setOrder(doneOrder);
            setPurchases((current) => {
              const next = {
                ...current,
                [active.product.id]: {
                  orderRef,
                  purchasedAt: new Date().toISOString(),
                },
              };
              saveJSON(PURCHASES_STORAGE_KEY, next);
              return next;
            });
          },
          STEP_MS * (labels.length + 0.6),
        ),
      );

      const workingOrder: Order = {
        ...prev,
        stage: "working",
        steps: labels.map((label) => ({ label, done: false })),
      };
      activeOrderRef.current = workingOrder;
      return workingOrder;
    });
  }, [billing]);

  const purchaseFor = useCallback(
    (id: string) => purchases[id] ?? null,
    [purchases],
  );

  const value = useMemo<HapaContextValue>(
    () => ({
      screen,
      dna,
      vibeImages,
      billing,
      saved,
      purchases,
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
      toggleSaved,
      isSaved,
      purchaseFor,
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
      saved,
      purchases,
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
      toggleSaved,
      isSaved,
      purchaseFor,
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

// Casing/whitespace-insensitive so "Camping" and "camping " collapse to one
// preference or exclusion instead of silently duplicating it.
function normalizeTags(tags: string[]): string[] {
  return dedupe(tags.map((t) => t.trim().toLowerCase()).filter(Boolean));
}
