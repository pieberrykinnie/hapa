import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "@/lib/sentry-scrub";

// No-op when NEXT_PUBLIC_SENTRY_DSN is unset — local dev without a DSN
// configured never errors, it just doesn't report (research.md R4).
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Session Replay (`Sentry.replayIntegration()`) is deliberately never
  // added to this config — it can capture rendered DOM content derived
  // from localStorage (style profile, ListingVisit records, billing
  // preference). Per contracts/operator-error-record.md, that capture
  // surface must be explicitly off, not left at whatever a copy-pasted
  // template defaults to; the default integrations (error capture,
  // breadcrumbs, dedupe) are unaffected — only replay is excluded.
  // contracts/operator-error-record.md's forbidden-content table, enforced
  // at the point of capture — see lib/sentry-scrub.ts.
  beforeSend: (event) => scrubEvent(event) as typeof event | null,
  beforeBreadcrumb: (breadcrumb) => scrubEvent(breadcrumb) as typeof breadcrumb | null,
});
