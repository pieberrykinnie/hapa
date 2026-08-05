import type { PaymentMethodId } from "@/lib/types";

export function PaymentMethodIcon({ method }: { method: PaymentMethodId }) {
  if (method === "apple_pay") {
    return (
      <svg viewBox="0 0 18 25" className="h-7 w-5" aria-hidden>
        <path fill="currentColor" d="M12.2 6.1c-.8 1-2 1.8-3.2 1.7-.2-1.2.4-2.5 1.1-3.3.8-.9 2.1-1.6 3.2-1.6.2 1.2-.3 2.4-1.1 3.2Zm1.1 2c-1.8-.1-3.3 1-4.1 1s-2.1-1-3.5-1C3.9 8.2 2.2 9.2 1.3 10.8c-1.9 3.3-.5 8.1 1.3 10.8.9 1.3 2 2.8 3.4 2.7 1.3-.1 1.8-.9 3.5-.9 1.6 0 2.1.9 3.5.8 1.5 0 2.4-1.3 3.3-2.7 1-1.5 1.5-3 1.5-3.1-.1 0-2.9-1.1-2.9-4.4 0-2.8 2.3-4.1 2.4-4.2-1.3-1.9-3.3-2.1-4-2.2v.5Z" />
      </svg>
    );
  }

  if (method === "google_pay") {
    return (
      <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
        <defs><linearGradient id="google-g" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#4285F4" /><stop offset=".36" stopColor="#34A853" /><stop offset=".68" stopColor="#FBBC04" /><stop offset="1" stopColor="#EA4335" /></linearGradient></defs>
        <text x="1" y="20" fill="url(#google-g)" fontFamily="Arial, sans-serif" fontSize="22" fontWeight="700">G</text>
      </svg>
    );
  }

  if (method === "paypal") {
    return (
      <svg viewBox="0 0 34 28" className="h-7 w-9" aria-hidden>
        <path fill="#003087" d="M10.4 2.5h8.1c4.5 0 7.1 2.4 6.4 6.5-.8 4.9-4.2 7.5-9.2 7.5h-2.3l-1.2 7.1H6.9l3.5-21.1Z" />
        <path fill="#009CDE" d="M15.1 8.1h7.2c3.9 0 6.1 2.1 5.5 5.6-.7 4.2-3.6 6.4-7.9 6.4h-2l-.9 5.4h-4.6l2.7-17.4Z" opacity=".9" />
      </svg>
    );
  }

  if (method === "affirm") {
    return (
      <svg viewBox="0 0 56 24" className="h-6 w-10" aria-hidden>
        <text x="1" y="16" fill="currentColor" fontFamily="Manrope, sans-serif" fontSize="13" fontWeight="700">affirm</text>
        <path d="M34 20c5-4.2 11.2-4.2 17 0" fill="none" stroke="#4AD6CD" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 36 28" className="h-7 w-9" aria-hidden>
      <rect x="1.5" y="3" width="33" height="22" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M2.5 10h31" stroke="currentColor" strokeWidth="3" />
      <path d="M7 19h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
