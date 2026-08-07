import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analyzePhotoForVibe } from "@/lib/groq-vision";

function fakeFile(name = "photo.jpg", type = "image/jpeg"): File {
  return new File([new Uint8Array([1, 2, 3])], name, { type });
}

function groqResponse(content: unknown) {
  return {
    ok: true,
    json: async () => ({ choices: [{ message: { content: JSON.stringify(content) } }] }),
  };
}

describe("lib/groq-vision", () => {
  const originalKey = process.env.GROQ_API_KEY;

  beforeEach(() => {
    process.env.GROQ_API_KEY = "test-key";
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = originalKey;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("returns a validated VibeShift for a well-formed response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        groqResponse({
          add_keywords: ["earth-tones", "vintage"],
          remove_keywords: [],
          dealbreakers: ["neon"],
        }),
      ),
    );
    const result = await analyzePhotoForVibe(fakeFile());
    expect(result).toEqual({
      add_keywords: ["earth-tones", "vintage"],
      remove_keywords: [],
      dealbreakers: ["neon"],
    });
  });

  it("returns null immediately when GROQ_API_KEY is missing, without calling fetch", async () => {
    delete process.env.GROQ_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await analyzePhotoForVibe(fakeFile());
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns null after the 5000ms timeout when fetch never resolves", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        });
      }),
    );
    const promise = analyzePhotoForVibe(fakeFile());
    await vi.advanceTimersByTimeAsync(5000);
    await expect(promise).resolves.toBeNull();
  });

  it("returns null for a malformed/non-JSON response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: "not json" } }] }),
      }),
    );
    const result = await analyzePhotoForVibe(fakeFile());
    expect(result).toBeNull();
  });

  it("returns null when a keyword matches a SENSITIVE_PATTERNS entry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        groqResponse({
          add_keywords: ["denim"],
          remove_keywords: [],
          dealbreakers: ["pregnant"],
        }),
      ),
    );
    const result = await analyzePhotoForVibe(fakeFile());
    expect(result).toBeNull();
  });
});
