import Vapi from "@vapi-ai/web";
import type { CreateAssistantDTO } from "@vapi-ai/web/dist/api";
import type { VibeShift } from "./types";

/** Name of the client-side tool the assistant calls to redirect the feed. */
export const SHIFT_FEED_VIBE_TOOL = "shift_feed_vibe";

let client: Vapi | null = null;
let teardown: Promise<unknown> = Promise.resolve();

/** Lazily creates the browser-only Vapi client. Never call during SSR. */
export function getVapiClient(): Vapi {
  if (!client) {
    const key = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    if (!key) throw new Error("NEXT_PUBLIC_VAPI_PUBLIC_KEY is not set");
    client = new Vapi(key);
  }
  return client;
}

/**
 * Vapi/Daily only allow one active call object per page — closing the
 * overlay and immediately reopening it can otherwise call `start()` before
 * the previous `stop()` finishes destroying the old one, which throws
 * "Duplicate DailyIframe instances are not allowed". Serializing start after
 * any in-flight stop avoids that race.
 */
export async function startVapiCall(config: CreateAssistantDTO) {
  await teardown;
  return getVapiClient().start(config);
}

export function stopVapiCall(): Promise<unknown> {
  teardown = getVapiClient()
    .stop()
    .catch(() => {});
  return teardown;
}

/**
 * Fully inline assistant — no Vapi dashboard assistant required, just the
 * public key. `voice.provider: "vapi"` uses Vapi's own hosted voices so no
 * extra provider credentials are needed either.
 *
 * There is deliberately no `confirm_purchase` (or any financial) tool here —
 * voice may only redirect the feed, never authorize a purchase.
 */
export const HAPA_ASSISTANT_CONFIG: CreateAssistantDTO = {
  firstMessage: "Hey, what are we shopping for?",
  model: {
    provider: "openai",
    model: "gpt-4o-mini",
    temperature: 0.4,
    messages: [
      {
        role: "system",
        content:
          "You are hapa, an upbeat AI DJ for a shopping app. The shopper describes " +
          "an activity, mood, or thing they don't want, and you redirect their " +
          "product feed to match. Keep replies to one short, casual sentence — " +
          "confirm what you're doing, don't ask clarifying questions unless the " +
          "request is completely empty of shopping content. " +
          `Whenever the shopper names a new direction, immediately call the ${SHIFT_FEED_VIBE_TOOL} ` +
          "tool with concrete lowercase keywords: add_keywords for what they now want, " +
          "remove_keywords for prior keywords that no longer apply, and dealbreakers for " +
          "anything they explicitly want excluded. You never place, confirm, or pay for " +
          "an order — that always happens outside this call.",
      },
    ],
    tools: [
      {
        type: "function",
        async: true,
        function: {
          name: SHIFT_FEED_VIBE_TOOL,
          description:
            "Redirect the shopper's product feed to a new activity, mood, or style direction.",
          parameters: {
            type: "object",
            properties: {
              add_keywords: {
                type: "array",
                items: { type: "string" },
                description: "Lowercase keywords/categories to shop for now, e.g. [\"camping\", \"waterproof\"].",
              },
              remove_keywords: {
                type: "array",
                items: { type: "string" },
                description: "Lowercase prior keywords that no longer apply, e.g. [\"desk\"].",
              },
              dealbreakers: {
                type: "array",
                items: { type: "string" },
                description: "Lowercase attributes to exclude entirely, e.g. [\"neon\", \"rgb\"].",
              },
            },
            required: ["add_keywords", "remove_keywords", "dealbreakers"],
          },
        },
      },
    ],
  },
  voice: {
    provider: "vapi",
    voiceId: "Elliot",
  },
};

export function toVibeShift(raw: unknown): VibeShift | null {
  if (typeof raw !== "object" || raw === null) return null;
  const value = raw as Record<string, unknown>;
  const strings = (v: unknown): string[] | null => {
    if (!Array.isArray(v) || !v.every((item) => typeof item === "string")) return null;
    return v.map((s) => s.trim().toLowerCase()).filter(Boolean);
  };

  const add_keywords = strings(value.add_keywords);
  const remove_keywords = strings(value.remove_keywords);
  const dealbreakers = strings(value.dealbreakers);
  if (!add_keywords || !remove_keywords || !dealbreakers) return null;

  return { add_keywords, remove_keywords, dealbreakers };
}
