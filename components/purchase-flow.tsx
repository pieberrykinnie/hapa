"use client";

import { motion } from "framer-motion";
import { useHapa } from "./hapa-provider";
import { CheckIcon, CloseIcon } from "./icons";
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
  const total = formatPrice(product.price, product.currency);

  return (
    <motion.div
      data-testid="purchase-confirm"
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
        className="flex flex-col gap-5 rounded-t-[28px] bg-paper px-6 pb-[calc(env(safe-area-inset-bottom)+22px)] pt-5"
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-line" />

        <div>
          <h2 className="font-display text-[22px] font-extrabold tracking-[-0.01em] text-ink">
            Review and confirm
          </h2>
          <p className="mt-1 text-[14px] text-ink-soft">
            HAPA will prepare checkout at {product.merchant}. You approve the
            purchase below.
          </p>
        </div>

        <div className="flex items-center gap-3.5 rounded-card border border-line bg-card p-3.5">
          <div className="size-[72px] shrink-0 overflow-hidden rounded-frame bg-sand">
            <ProductPhoto image={product.image} caption={product.title} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="line-clamp-2 font-display text-[15px] font-bold leading-snug text-ink">
              {product.title}
            </div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-pine">
              {product.merchant}
            </div>
            <div className="mt-1 font-display text-[17px] font-bold text-ink">
              {total}
            </div>
          </div>
        </div>

        <dl className="flex flex-col gap-3 rounded-card bg-sand/60 p-4 text-[13.5px]">
          <Row label="Payment" value={billing?.label ?? "Not selected"} />
          {product.salePct != null && (
            <Row
              label="Merchant offer"
              value={`${product.salePct}% off`}
              accent
            />
          )}
          <div className="flex items-center justify-between border-t border-line pt-3">
            <dt className="font-display text-[15px] font-bold text-ink">Total</dt>
            <dd className="font-display text-xl font-extrabold text-ink">
              {total}
            </dd>
          </div>
        </dl>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={confirmPurchase}
            disabled={!billing}
            className="w-full rounded-full bg-ink py-[17px] font-display text-base font-bold text-paper"
          >
            {billing ? `Confirm purchase · ${total}` : "Choose a payment method"}
          </button>
          <p className="text-center text-[11.5px] leading-relaxed text-ink-faint">
            HAPA never purchases without this confirmation.
          </p>
          <button
            type="button"
            onClick={cancelPurchase}
            className="w-full py-1 font-display text-[14px] font-bold text-ink-soft"
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
  const { order, billing, cancelPurchase, requestPurchase } = useHapa();
  if (!order) return null;
  const done = order.stage === "done";
  const current = order.steps.find((s) => !s.done);
  const completed = order.steps.filter((step) => step.done).length;
  const progress = order.steps.length
    ? Math.round((completed / order.steps.length) * 100)
    : 0;
  const total = formatPrice(order.product.price, order.product.currency);

  return (
    <motion.div
      data-testid={done ? "purchase-complete" : "purchase-progress"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 flex flex-col bg-ink"
    >
      <div className="flex items-center justify-between px-6 pt-[calc(env(safe-area-inset-top)+18px)]">
        <span className="text-[11px] font-bold uppercase tracking-[0.09em] text-paper-dim">
          {done ? "Order complete" : "Secure checkout"}
        </span>
        {done && (
          <button
            type="button"
            aria-label="Close"
            onClick={cancelPurchase}
            className="flex size-10 items-center justify-center rounded-full border border-line-dark text-paper-dim"
          >
            <CloseIcon />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-center gap-6 px-6">
        <div className="flex flex-col items-center gap-3">
          {done ? (
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 14 }}
              className="flex size-16 items-center justify-center rounded-full bg-pine text-paper"
            >
              <CheckIcon size={34} />
            </motion.div>
          ) : (
            <div className="relative flex size-16 items-center justify-center rounded-full bg-bubble">
              <motion.div
                className="absolute inset-0 rounded-full border-[3px] border-line-dark border-t-pine"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
              />
              <span className="text-[11px] font-bold text-paper">{progress}%</span>
            </div>
          )}
          <h2 className="text-center font-display text-[24px] font-bold tracking-[-0.02em] text-paper">
            {done ? "Order confirmed" : "HAPA is checking out"}
          </h2>
          <p className="max-w-[320px] text-center text-[13.5px] leading-relaxed text-paper-dim">
            {done
              ? `Receipt ready · ${order.orderRef}`
              : (current?.label ?? "Wrapping up")}
          </p>
        </div>

        <div className="rounded-card border border-line-dark bg-bubble p-3.5">
          <div className="flex items-center gap-3.5">
            <div className="size-16 shrink-0 overflow-hidden rounded-frame bg-line-dark">
              <ProductPhoto
                image={order.product.image}
                caption={order.product.title}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 font-display text-[14px] font-bold leading-snug text-paper">
                {order.product.title}
              </p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-pine-soft">
                {order.product.merchant}
              </p>
            </div>
            <span className="font-display text-[16px] font-bold text-paper">
              {total}
            </span>
          </div>

          {done ? (
            <dl className="mt-3.5 grid grid-cols-2 gap-2 border-t border-line-dark pt-3.5 text-[11.5px]">
              <div>
                <dt className="text-ink-faint">Paid with</dt>
                <dd className="mt-0.5 truncate font-semibold text-paper-dim">
                  {billing?.label ?? "Payment method"}
                </dd>
              </div>
              <div>
                <dt className="text-ink-faint">Receipt</dt>
                <dd className="mt-0.5 font-semibold text-paper-dim">Sent to email</dd>
              </div>
            </dl>
          ) : (
            <div className="mt-3.5 border-t border-line-dark pt-3.5">
              <div className="h-1.5 overflow-hidden rounded-full bg-line-dark">
                <motion.div
                  className="h-full rounded-full bg-pine"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                />
              </div>
              <p className="mt-2 text-[11.5px] text-ink-faint">
                {completed} of {order.steps.length} checkout steps complete
              </p>
            </div>
          )}
        </div>

        {done && (
          <div className="flex items-center justify-center gap-2 text-[12px] font-medium text-pine-soft">
            <CheckIcon size={16} />
            <span>{order.steps.length} checkout steps verified</span>
          </div>
        )}
      </div>

      <div className="shrink-0 px-7 pb-[calc(env(safe-area-inset-bottom)+36px)] pt-4">
        {done ? (
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={cancelPurchase}
              className="min-w-0 flex-1 rounded-full border border-line-dark py-[16px] font-display text-[14px] font-bold text-paper-dim"
            >
              Keep shopping
            </button>
            <button
              type="button"
              onClick={() => requestPurchase(order.product)}
              className="min-w-0 flex-1 rounded-full bg-paper py-[16px] font-display text-[14px] font-bold text-ink"
            >
              Buy another
            </button>
          </div>
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

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: currency || "CAD",
    maximumFractionDigits: Number.isInteger(price) ? 0 : 2,
  }).format(price);
}
