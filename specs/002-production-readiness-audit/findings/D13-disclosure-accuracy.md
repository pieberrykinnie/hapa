# D13 — Disclosure Accuracy

**Verdict**: FAIL
**Basis**: One of the app's two photo-analysis surfaces actively tells the shopper an analysis is
happening that does not happen. The other is honestly disclosed. The dishonest one is sufficient to
fail this dimension.

## Findings

#### F-D13-01 — "Show hapa a vibe" claims to read the photo's colors and style; it applies a hardcoded result regardless of the photo

- **Dimension**: D13
- **Severity**: S0 (blocks launch — a verified, currently-live false statement shown to every user
  of this feature)
- **Kind**: INCORRECT
- **Verification**: VERIFIED
- **Free-tier feasible**: YES
- **Severity depends on assumption**: none

**Evidence**
1. `CODE` — `components/photo-vibe-overlay.tsx:12-16` —
   `PHOTO_DEMO_SHIFT = { add_keywords: ["earth-tones", "vintage"], remove_keywords: [],
   dealbreakers: ["neon"] }`, a fixed constant.
2. `CODE` — `components/photo-vibe-overlay.tsx:39-46` — `submit()` calls
   `applyVibeShift(PHOTO_DEMO_SHIFT)` after a fixed `READING_MS = 1600` delay
   (`components/photo-vibe-overlay.tsx:17`), regardless of which file was selected.
3. `CODE` — `components/photo-vibe-overlay.tsx:80-81` — shown during that delay: "Reading your
   photo for colors, textures, and style…".
4. `CODE` — `components/photo-vibe-overlay.tsx:87` — shown before selection: "hapa reads the vibe —
   not who's in it."
5. `CODE` — `components/photo-vibe-overlay.tsx:10-11` — the module's own comment confirms this is
   intentional: "Stands in for real vision analysis... the demo has no vision model wired up, so a
   photo always reads as this plausible shift."

**Impact**
Every shopper who uses this feature is told, twice, that their specific photo is being analyzed for
its visual qualities. It is not — the outcome is identical no matter what photo (or, if the file
picker is inspected, no matter whether a photo is a photo at all) is selected. This is a verified
instance of the exact pattern Principle III's neighboring language warns against: presenting a
fabricated outcome as if it were real.

**Resolution condition**
Either the feature performs a genuine analysis of the selected image (even a simple one, e.g.
dominant-color extraction, would be honest), or its copy is changed to accurately describe a fixed
demo shift rather than claiming to read the photo.

**Blocked by**: none

---

**Contrast for context (not a finding)**: the primary onboarding photo-upload flow
(`components/onboarding/ProfileSetup.tsx`) is honestly disclosed — "Filename cues stay on this
device. Images are never uploaded." accurately describes its real, filename-only behavior (verified
in D03). The dimension still FAILs because F-D13-01 describes a different, currently reachable
feature with a verified false claim.
