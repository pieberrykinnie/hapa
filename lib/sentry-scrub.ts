// Structural enforcement of contracts/operator-error-record.md's forbidden
// content table — the scrubbing rule lives here, at the point of capture, not
// as a discipline every call site must remember (same pattern lib/onboarding/
// rules.ts's SENSITIVE_PATTERNS uses for Principle VII elsewhere).

const REDACTED = "[redacted]";

// localStorage key names this app uses — a Sentry event carrying any of
// these (as an object key or a bare string value) is treated as a leaked
// storage snapshot and stripped.
const LOCALSTORAGE_KEYS = ["hapa.dna", "hapa.billing", "hapa.saved", "hapa.listing-visits"];

function secretValues(): string[] {
  return [process.env.GROQ_API_KEY, process.env.SERPAPI_KEY, process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY].filter(
    (value): value is string => Boolean(value),
  );
}

function looksLikeDataOrObjectUrl(value: string): boolean {
  return /data:image\//i.test(value) || /\bblob:/i.test(value);
}

function isForbiddenString(value: string, secrets: string[]): boolean {
  if (looksLikeDataOrObjectUrl(value)) return true;
  if (LOCALSTORAGE_KEYS.includes(value)) return true;
  return secrets.some((secret) => value.includes(secret));
}

function isVibePhotoRequest(obj: Record<string, unknown>): boolean {
  const url = obj.url;
  return typeof url === "string" && url.includes("/api/vibe-photo");
}

function redact(value: unknown, secrets: string[]): unknown {
  if (typeof value === "string") {
    return isForbiddenString(value, secrets) ? REDACTED : value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redact(item, secrets));
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const vibePhotoRequest = isVibePhotoRequest(obj);
    const next: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (LOCALSTORAGE_KEYS.includes(key)) {
        next[key] = REDACTED;
        continue;
      }
      // Full request/response bodies for the photo-analysis route: the
      // request body *is* the photo.
      if (vibePhotoRequest && (key === "data" || key === "body")) {
        next[key] = REDACTED;
        continue;
      }
      next[key] = redact(val, secrets);
    }
    return next;
  }
  return value;
}

/**
 * `beforeSend`/`beforeBreadcrumb` hook for both Sentry configs. Returns a
 * deep-redacted clone of the event/breadcrumb — never mutates the input —
 * or `null` when there's nothing to scrub (a null/undefined event).
 */
export function scrubEvent(event: unknown): unknown | null {
  if (event === null || event === undefined) return null;
  return redact(event, secretValues());
}
