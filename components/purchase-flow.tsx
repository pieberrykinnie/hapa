"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useHapa } from "./hapa-provider";
import { ProductPhoto } from "./product-photo";

export function PurchaseFlow() {
  const { order } = useHapa();
  if (!order) return null;
  if (order.stage === "confirm") return <ConfirmSheet />;
  return <AgentRun />;
}

/* ── step 1: double-check the tap was meant ───────────────────────────── */

function ConfirmSheet() {
  const { order, billing, confirmPurchase, cancelPurchase } = useHapa();
  if (!order) return null;
  const { product } = order;
  const total = product.salePct
    ? Math.round(product.price * (1 - product.salePct / 100))
    : product.price;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 flex flex-col justify-end bg-ink/45"
      onClick={cancelPurchase}
    >
      <motion.div
        initial={{ y: 320 }}
        animate={{ y: 0 }}
        exit={{ y: 320 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col gap-5 rounded-t-[28px] bg-paper px-6 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-5"
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-line" />

        <div>
          <h2 className="font-display text-[22px] font-extrabold tracking-[-0.01em] text-ink">
            Buy this for you?
          </h2>
          <p className="mt-1 text-[14px] text-ink-soft">
            hapa will go to {product.merchant} and check out on your behalf.
          </p>
        </div>

        <div className="flex items-center gap-3.5 rounded-card border border-line bg-card p-3">
          <div className="size-16 shrink-0 overflow-hidden rounded-frame">
            <ProductPhoto image={product.image} caption={product.title} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-[15px] font-bold text-ink">
              {product.title}
            </div>
            <div className="mt-0.5 text-[13px] text-ink-soft">
              {product.merchant}
            </div>
          </div>
        </div>

        <dl className="flex flex-col gap-2 text-[14px]">
          <Row label="Item" value={`$${product.price}`} />
          {product.salePct != null && (
            <Row
              label={`Discount (−${product.salePct}%)`}
              value={`−$${product.price - total}`}
              accent
            />
          )}
          <Row label="Paying with" value={billing?.label ?? "—"} />
          <div className="mt-1 flex items-center justify-between border-t border-line pt-3">
            <dt className="font-display text-[15px] font-bold text-ink">Total</dt>
            <dd className="font-display text-[17px] font-extrabold text-ink">
              ${total}
            </dd>
          </div>
        </dl>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={confirmPurchase}
            className="w-full rounded-full bg-ink py-[17px] font-display text-base font-bold text-paper"
          >
            Yes, buy it
          </button>
          <button
            type="button"
            onClick={cancelPurchase}
            className="w-full rounded-full border border-line bg-card py-[15px] font-display text-[15px] font-bold text-ink-soft"
          >
            Not now
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-soft">{label}</dt>
      <dd className={accent ? "font-medium text-pine" : "font-medium text-ink"}>
        {value}
      </dd>
    </div>
  );
}

/* ── step 2/3: the agent works, then hands back a receipt ─────────────── */

function AgentRun() {
  const { order, cancelPurchase } = useHapa();
  if (!order) return null;
  const done = order.stage === "done";
  const current = order.steps.find((s) => !s.done);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 flex flex-col bg-ink"
    >
      <div className="flex items-center justify-between px-7 pt-[calc(env(safe-area-inset-top)+20px)]">
        <span className="font-display text-[15px] font-bold text-paper">
          {done ? "All done" : "hapa is buying"}
        </span>
        {done && (
          <button
            type="button"
            aria-label="Close"
            onClick={cancelPurchase}
            className="flex size-[34px] items-center justify-center rounded-full border-[1.5px] border-line-dark text-[15px] text-ink-faint"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-center gap-8 px-8">
        <div className="flex flex-col items-center gap-4">
          {done ? (
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 14 }}
              className="flex size-16 items-center justify-center rounded-full bg-pine text-3xl text-paper"
            >
              ✓
            </motion.div>
          ) : (
            <motion.div
              className="size-16 rounded-full border-4 border-bubble border-t-pine"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
            />
          )}
          <AnimatePresence mode="wait">
            <motion.p
              key={done ? "done" : (current?.label ?? "wrapping")}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="text-center font-display text-[17px] font-bold text-paper"
            >
              {done
                ? `Bought. Order ${order.orderRef}`
                : (current?.label ?? "Wrapping up")}
            </motion.p>
          </AnimatePresence>
          {done && (
            <p className="text-center text-[13.5px] leading-relaxed text-paper-dim">
              {order.product.title} from {order.product.merchant}. Receipt is in
              your email.
            </p>
          )}
        </div>

        <ol className="flex flex-col gap-2.5">
          {order.steps.map((step) => (
            <li key={step.label} className="flex items-center gap-3">
              <span
                className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] ${
                  step.done
                    ? "bg-pine text-paper"
                    : "border border-line-dark text-transparent"
                }`}
              >
                ✓
              </span>
              <span
                className={`text-[14px] ${
                  step.done ? "text-paper-dim" : "text-ink-faint"
                }`}
              >
                {step.label}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="shrink-0 px-7 pb-[calc(env(safe-area-inset-bottom)+36px)] pt-4">
        {done ? (
          <button
            type="button"
            onClick={cancelPurchase}
            className="w-full rounded-full bg-paper py-[17px] font-display text-base font-bold text-ink"
          >
            Back to the feed
          </button>
        ) : (
          <button
            type="button"
            onClick={cancelPurchase}
            className="w-full rounded-full border border-line-dark py-[15px] font-display text-[15px] font-bold text-ink-faint"
          >
            Stop
          </button>
        )}
      </div>
    </motion.div>
  );
}
