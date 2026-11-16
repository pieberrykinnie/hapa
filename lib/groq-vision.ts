import { SENSITIVE_PATTERNS } from "./onboarding/rules";
import type { VibeShift } from "./types";

// Real photo-vibe analysis via Groq's vision-capable JSON mode. Every
// caller failure mode — missing key, timeout, malformed response, or
// output that fails the sensitive-content filter — resolves to `null`,
// mirroring lib/serpapi.ts's and lib/vapi.ts's empty-return-on-failure
// convention. Never a thrown exception the caller must remember to catch.

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const TIMEOUT_MS = 5000;
const DEFAULT_MODEL = "qwen/qwen3.6-27b";

const SYSTEM_PROMPT =
  "You analyze a shopper's uploaded photo to suggest a shift in their product feed. " +
  "Respond ONLY with JSON shaped like " +
  '{"add_keywords": string[], "remove_keywords": string[], "dealbreakers": string[]}. ' +
  "Every keyword must be a concrete, shoppable visual signal — colors, materials, " +
  "silhouettes, aesthetics, or activity/category terms. " +
  "NEVER include or infer anything about the people in the photo: no race, ethnicity, " +
  "religion, disability, sexuality, pregnancy, biometric signal, gender identity, " +
  "medical/health condition, age, or identity. Describe only the vibe, not who's in it.";

interface GroqChatResponse {
  choices?: { message?: { content?: string } }[];
}

export async function analyzePhotoForVibe(photo: File): Promise<VibeShift | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  let dataUrl: string;
  try {
    const bytes = new Uint8Array(await photo.arrayBuffer());
    const base64 = Buffer.from(bytes).toString("base64");
    dataUrl = `data:${photo.type || "image/jpeg"};base64,${base64}`;
  } catch {
    return null;
  }

  const model = process.env.PHOTO_MODEL || DEFAULT_MODEL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "What shopping vibe does this photo suggest?" },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as GroqChatResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    return validateShift(JSON.parse(content));
  } catch {
    return null; // timeout, network error, or malformed JSON
  } finally {
    clearTimeout(timeout);
  }
}

function validateShift(raw: unknown): VibeShift | null {
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

  const prose = [...add_keywords, ...remove_keywords, ...dealbreakers].join(" ");
  if (SENSITIVE_PATTERNS.some((pattern) => pattern.test(prose))) return null;

  return { add_keywords, remove_keywords, dealbreakers };
}
