import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "@/lib/sentry-scrub";

// No-op when SENTRY_DSN is unset — local dev without a DSN configured never
// errors, it just doesn't report (research.md R4).
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  // contracts/operator-error-record.md's forbidden-content table, enforced
  // at the point of capture — see lib/sentry-scrub.ts.
  beforeSend: (event) => scrubEvent(event) as typeof event | null,
  beforeBreadcrumb: (breadcrumb) => scrubEvent(breadcrumb) as typeof breadcrumb | null,
});
