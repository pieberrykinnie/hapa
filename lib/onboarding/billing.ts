import type { PaymentMethodId, PaymentMethodReadiness } from "@/lib/types";

const METHODS: Array<{ id: PaymentMethodId; name: string; reason: string }> = [
  { id: "apple_pay", name: "Apple Pay", reason: "Confirm with Apple Wallet at checkout" },
  { id: "google_pay", name: "Google Pay", reason: "Use cards saved to Google Wallet" },
  { id: "paypal", name: "PayPal", reason: "Continue securely with PayPal" },
  { id: "affirm", name: "Affirm", reason: "Check eligibility when you buy" },
  { id: "card", name: "Credit or debit card", reason: "Enter securely at checkout" },
];

export function getBillingReadiness(): PaymentMethodReadiness[] {
  return METHODS.map((method) => ({
    ...method,
    status: "setup_required" as const,
    selectable: true,
  }));
}
