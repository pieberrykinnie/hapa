# D07 — Secrets and Configuration

**Verdict**: CONCERNS
**Basis**: No actual secret exposure was found — the one server-only secret in use is verified to
never cross into client code — but the repository's own example configuration is materially
incomplete relative to what the running code needs.

## Findings

#### F-D07-01 — `.env.local.example` documents 1 of the 4 environment variables the active code reads

- **Dimension**: D07
- **Severity**: S2
- **Kind**: INCORRECT
- **Verification**: VERIFIED
- **Free-tier feasible**: YES
- **Severity depends on assumption**: none

**Evidence**
1. `CODE` — `.env.local.example:1-2` — documents only `NEXT_PUBLIC_VAPI_PUBLIC_KEY`.
2. `CODE` — `lib/serpapi.ts:200,293` — `process.env.SERPAPI_KEY` is read in two functions and is
   required for live product discovery to function at all.
3. `CODE` — `lib/serpapi.ts:201,294` — `process.env.FORCE_FALLBACK` is read as an explicit
   fallback-forcing switch.
4. `CODE` — `components/hapa-provider.tsx` / Next.js runtime — `process.env.NODE_ENV` is read at
   `lib/vapi.ts:17` (framework-provided, not operator-configured, so not itself a doc gap).

**Impact**
A new operator who copies `.env.local.example` to `.env.local` and fills in only what it lists gets
a working voice integration but a feed that silently runs in fallback-only mode with no indication
why — `SERPAPI_KEY` and `FORCE_FALLBACK` are invisible to them.

**Resolution condition**
`.env.local.example` lists every environment variable the active code reads, including
`SERPAPI_KEY` and `FORCE_FALLBACK`.

**Blocked by**: none

---

**Positive evidence supporting the CONCERNS (not FAIL) verdict**: `SERPAPI_KEY` is read only in
`lib/serpapi.ts`, which carries no `"use client"` directive and is imported solely by the two
server-side route handlers `app/api/feed/route.ts` and `app/api/products/gallery/route.ts` —
confirmed never reachable from browser code. `NEXT_PUBLIC_VAPI_PUBLIC_KEY` is correctly
public-prefixed by design (Vapi's client SDK key is not a secret per Vapi's own architecture,
`lib/vapi.ts:12-16`). No secret value is written to `localStorage`, logged, or otherwise exposed.
