# D14 — Documentation and Operator Onboarding

**Verdict**: CONCERNS
**Basis**: No finding here rises to launch-blocking, but a new operator or contributor consulting
this repository's documentation would be actively misled in three distinct, verified ways.

## Findings

#### F-D14-01 — README instructs the wrong port

- **Dimension**: D14
- **Severity**: S2
- **Kind**: INCORRECT
- **Verification**: VERIFIED
- **Free-tier feasible**: YES

**Evidence**
1. `CODE` — `README.md` — the unmodified `create-next-app` template, instructing "Open
   http://localhost:3000".
2. `CODE` — `package.json` scripts.dev — `"next dev --webpack --hostname 127.0.0.1 --port 3001"`.

**Impact**
A new operator following the checked-in README literally gets a connection error, not a running
app.

**Resolution condition**
README reflects the actual dev command and port.

**Blocked by**: none

---

#### F-D14-02 — Three mutually inconsistent pictures of required environment configuration coexist

- **Dimension**: D14
- **Severity**: S2
- **Kind**: INCORRECT
- **Verification**: VERIFIED
- **Free-tier feasible**: YES

**Evidence**
1. `CODE` — `.env.local.example` — documents 1 variable (`NEXT_PUBLIC_VAPI_PUBLIC_KEY`).
2. `CODE` — active code requires 2 more, undocumented in that file (`SERPAPI_KEY`,
   `FORCE_FALLBACK` — see F-D07-01).
3. `CODE` — `SPEC.md:861-879` — documents a wholly different, 12-variable block
   (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `PHOTO_MODEL`,
   `VIBE_MODEL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `APP_URL`, `PAYMENTS_MODE`, plus `SERPAPI_KEY` and
   `NEXT_PUBLIC_VAPI_PUBLIC_KEY`) for a Supabase/Groq/Stripe-backed system.
4. `ABSENT_ARTIFACT` — no `@supabase/*`, `groq`, or `stripe` package appears in `package.json`;
   no matching source files exist anywhere in the repository for that system.

**Impact**
A contributor who consults `SPEC.md` §14 for setup guidance — the natural place to look — would
configure an entirely different, unbuilt system. Nothing at the top of `SPEC.md` signals that its
architecture describes a future target rather than the current build; that context lives only in
the constitution's Local Prototype Exception and `specs/001-voice-shopping-feed/spec.md`'s
Prototype Mode banner, neither of which `SPEC.md` itself references.

**Resolution condition**
`SPEC.md` clearly marks which sections describe the current build versus the target architecture,
or the repository's actual `.env.local.example` is reconciled with what the active code needs.

**Blocked by**: none

---

#### F-D14-03 — `specs/001-voice-shopping-feed/contracts/local-storage.md` claims visual-feature extraction that the code doesn't perform

- **Dimension**: D14
- **Severity**: S2
- **Kind**: INCORRECT
- **Verification**: VERIFIED
- **Free-tier feasible**: YES

**Evidence**
1. `DOC_CONFLICT` — `specs/001-voice-shopping-feed/contracts/local-storage.md:12` states
   `prepareLocalPhoto` "extracts visual features."
2. `CODE` — `lib/onboarding/local-store.ts:198-233` — `prepareLocalPhoto` assigns
   `features: neutralVisualFeatures()`, a hardcoded constant
   (`lib/onboarding/local-store.ts:468-478`; identical palette/saturation/luminance/etc. for every
   photo), never calling the real pixel-analysis function.
3. `CODE` — `lib/onboarding/local-store.ts:235-296` — `extractVisualFeatures(pixels, width,
   height)` is a genuine, correct pixel-analysis implementation that exists in the same file but is
   called only from `tests/local-onboarding.test.ts`'s `solidPhoto` helper — never from application
   code.

**Impact**
Per FR-010, the code is authoritative: no uploaded photo's actual colors, contrast, or warmth are
analyzed in the running app — only its filename is (confirmed separately as accurate and
well-disclosed in D03). This is not a privacy or safety issue — if anything the system does *less*
photo analysis than documented — but it is a verified, concrete gap between a written contract and
the code implementing it, in the currently active path.

**Resolution condition**
Either `prepareLocalPhoto` is wired to call `extractVisualFeatures` on the real image data, or the
local-storage contract is corrected to state that visual features are a fixed placeholder today.

**Blocked by**: none
