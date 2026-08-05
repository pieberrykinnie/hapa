import type { VibeShift } from "./types";

const NEGATIONS = ["no ", "not ", "skip ", "less ", "avoid ", "none of the "];

/**
 * Deterministic text → VibeShift fallback (mirrors the rules-based path the
 * spec calls for when there's no LLM in the loop). "no neon, camping and
 * waterproof gear" → add camping/waterproof gear, dealbreaker neon.
 */
export function parseVibeText(raw: string): VibeShift | null {
  const phrases = raw
    .toLowerCase()
    .split(/,|&|\band\b/)
    .map((p) => p.trim().replace(/\s+/g, " "))
    .filter(Boolean);

  const add = new Set<string>();
  const remove = new Set<string>();

  for (const phrase of phrases) {
    const negated = NEGATIONS.find((n) => phrase.startsWith(n));
    if (negated) {
      const rest = phrase.slice(negated.length).trim();
      if (rest) remove.add(rest);
    } else {
      add.add(phrase);
    }
  }

  if (add.size === 0 && remove.size === 0) return null;

  return {
    add_keywords: Array.from(add).slice(0, 6),
    remove_keywords: [],
    dealbreakers: Array.from(remove).slice(0, 4),
  };
}
