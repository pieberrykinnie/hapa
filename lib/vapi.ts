import Vapi from "@vapi-ai/web";
import type { ChunkPlan, CreateAssistantDTO } from "@vapi-ai/web/dist/api";
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
    // Low temperature — this assistant's job is reliable tool-calling, not
    // conversational variety. Higher values made it skip the tool call and
    // just chat in response to a request.
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content:
          "You are hapa, an AI shopping assistant for a shopping app. Your ONLY job is to translate " +
          `what the shopper says into a call to the ${SHIFT_FEED_VIBE_TOOL} tool — you do not ` +
          "just chat about it. " +
          `RULE: the moment the shopper names any activity, mood, category, or thing they don't ` +
          `want, call ${SHIFT_FEED_VIBE_TOOL} in that same turn, before or while you reply. Do this ` +
          "every single time, even for a short or casual request — never respond with only " +
          "talk and no tool call. Only skip the call if the shopper said nothing shopping-related " +
          "at all (e.g. small talk or a question about you). " +
          "\n\nExample: shopper says \"I'm going camping this weekend, no neon\" → call " +
          `${SHIFT_FEED_VIBE_TOOL} with add_keywords: ["camping"], remove_keywords: [], ` +
          'dealbreakers: ["neon"] — THEN say something short like "Say less, pulling up camping gear, no neon."' +
          "\n\nadd_keywords/remove_keywords/dealbreakers must only be concrete shoppable " +
          "categories, activities, or attributes — never filler words, greetings, or " +
          'interjections ("yo", "hey", "so", "um", "like").' +
          "\n\nKeep spoken replies to one short, casual sentence confirming what you changed. " +
          "Don't ask clarifying questions. You never place, confirm, or pay for an order — that " +
          "always happens outside this call.",
      },
    ],
    tools: [
      {
        type: "function",
        async: true,
        function: {
          name: SHIFT_FEED_VIBE_TOOL,
          strict: true,
          description:
            "Redirect the shopper's product feed to a new activity, mood, or style direction. " +
            "Call this every time the shopper names something they want or don't want — never " +
            "just reply in speech without calling it.",
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
    voiceId: "Savannah",
    // Default chunking (30 chars, wide punctuation boundaries) sends short
    // fragments to the voice provider and can produce audible seams between
    // synthesized chunks. Larger, sentence-bounded chunks trade a little
    // latency for materially cleaner playback. https://docs.vapi.ai — ChunkPlan.
    chunkPlan: {
      minCharacters: 80,
      // The generated type only allows a single value here — a known
      // swagger-typescript-api generation quirk (the SDK's own JSDoc
      // @example shows an array). The API accepts an array at runtime.
      punctuationBoundaries: [".", "!", "?"] as unknown as ChunkPlan["punctuationBoundaries"],
    },
  },
};

/**
 * The generated SDK types claim `toolCall.function.arguments` is always a
 * JSON string, but in practice (at least with `strict: true`) Vapi/OpenAI's
 * structured-output mode delivers it as an already-parsed object. Handle
 * both so a shape mismatch can't silently drop a real tool call.
 */
export function parseToolArguments(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Belt-and-suspenders against the model occasionally slipping a filler word
// or greeting into a keyword array despite the prompt telling it not to —
// these would otherwise burn one of buildQuery's 3-keyword slots for nothing.
const FILLER_WORDS = new Set(["yo", "hey", "hi", "so", "um", "uh", "like", "well", "ok", "okay"]);

export function toVibeShift(raw: unknown): VibeShift | null {
  if (typeof raw !== "object" || raw === null) return null;
  const value = raw as Record<string, unknown>;
  const strings = (v: unknown): string[] | null => {
    if (!Array.isArray(v) || !v.every((item) => typeof item === "string")) return null;
    return v
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0 && !FILLER_WORDS.has(s));
  };

  const add_keywords = strings(value.add_keywords);
  const remove_keywords = strings(value.remove_keywords);
  const dealbreakers = strings(value.dealbreakers);
  if (!add_keywords || !remove_keywords || !dealbreakers) return null;

  return { add_keywords, remove_keywords, dealbreakers };
}
