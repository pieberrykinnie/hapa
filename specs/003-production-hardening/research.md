# Phase 0 Research: Production Hardening — Decide What's Real

**Date**: 2026-08-06 | **Plan**: [plan.md](./plan.md)

## R1 — Vision-capable model for real photo-vibe analysis (US2)

**Decision**: Use Groq's `qwen/qwen3.6-27b` multimodal model for the photo-vibe-shift analysis,
retrieving structured keyword/attribute output via Groq's JSON mode.

**Rationale**: This is not a new choice — `SPEC.md:868` already names `qwen/qwen3.6-27b` as the
intended photo-analysis model for the aspirational architecture, and
[Groq's current vision documentation](https://console.groq.com/docs/vision) (retrieved 2026-08-06)
confirms it remains Groq's vision-capable offering today: "A 27B multimodal model that processes
both text and image inputs, with thinking and non-thinking modes, tool use, and JSON mode," a 131K
token context window, up to 5 images per request, 20MB per image. One photo per analysis (this
feature's scope) sits far inside every one of those limits. JSON mode gives a direct path to the
structured `VibeShift`-shaped output (`add_keywords`, `remove_keywords`, `dealbreakers`) this
feature needs, matching the pattern `lib/vapi.ts` already uses for the voice assistant's tool-call
output.

**Free-tier fit**: [Groq's rate-limit documentation](https://console.groq.com/docs/rate-limits)
(retrieved 2026-08-06) states free-tier limits of 30 requests/minute and 1,000-14,400 requests/day
(varies by model), organization-wide, no credit card required. At five users occasionally using one
feed-steering feature, this is not a constrained resource the way SerpApi's quota was in the audit
— even the conservative end of that range is orders of magnitude beyond expected use. No
`free_tier_feasible = NO` risk here, unlike the audit's SerpApi/Vercel/Vapi findings.

**Alternatives considered**: A second vision provider (e.g. a different vendor's free tier) was not
investigated — `SPEC.md` already commits to Groq for this exact purpose, the project's other
server-side integration (SerpApi) establishes the pattern of a single server-only API key read from
an environment variable, and introducing a second AI vendor for one feature would add operational
surface (a second key, a second failure mode to design a fallback for) without a stated reason to
prefer it over the already-planned choice.

**Constraint carried into design**: per spec FR-007, the model must be prompted and its output
constrained the same way `lib/onboarding/rules.ts`'s `SENSITIVE_PATTERNS` guard already constrains
the (currently dormant) generated-suggestion path — shopping-relevant visual signals only, with
identity/biometric/protected-trait content rejected. The existing `safeSuggestions` validator in
that file is the template for how this feature's output must be checked before use, not a new
mechanism invented from scratch.

---

## R2 — CI provider for automated quality gates (US6)

**Decision**: GitHub Actions.

**Rationale**: `git remote -v` confirms this repository's origin is `github.com/pieberrykinnie/hapa`
(public — confirmed via `gh repo view`). GitHub Actions is free with no minute cap for public
repositories, requires no new account or vendor relationship, and is the default, best-documented CI
choice for a project already hosted on GitHub. No research risk here comparable to the audit's
provider-terms findings — this is an unambiguous fit.

**Alternatives considered**: A third-party CI service (CircleCI, Travis). Rejected — no advantage
over GitHub Actions for a public repo already on GitHub, and it adds a vendor relationship this
project doesn't need.

---

## R3 — Fixing the frozen-lockfile failure (closes F-D15-01, supports US6)

**Decision**: Regenerate `pnpm-lock.yaml` under the pinned `pnpm@11.2.2` (the version
`package.json`'s `packageManager` field already declares) and commit the result.

**Rationale**: The audit (`specs/002-production-readiness-audit/findings/_provenance.md`) already
demonstrated the fix directly: `pnpm install --no-frozen-lockfile` succeeds under the installed
`pnpm@11.2.2` and rewrites the lockfile to a compatible format (that rewrite was reverted during the
audit specifically to preserve the audit's read-only constraint — this feature is not so
constrained). No open question remains; this is a mechanical fix, not a research task. The
regenerated lockfile is reviewed as a normal diff before committing, consistent with the
constitution's general change-review expectations.

**Alternatives considered**: Pinning an older `pnpm` version to match the existing
`lockfileVersion: '6.0'` instead of regenerating. Rejected — `package.json` already declares
`pnpm@11.2.2` as the project's intended package manager; downgrading it to match a stale lockfile
solves the symptom backwards and would need to be undone the next time any dependency is touched.

---

## R4 — Error-monitoring service for operability (US5)

**Decision**: Sentry, using its official Next.js App Router SDK.

**Rationale**: [Search-aggregated pricing coverage of Sentry's 2026 free tier](https://costbench.com/software/developer-tools/sentry/free-plan/)
places it at 5,000 errors/month on the free plan, described across multiple sources as comfortably
covering a small Next.js app's error volume with "no reason to upgrade until ~5,000 MAU" — several
orders of magnitude beyond this project's five-user launch target. Sentry's Next.js SDK captures
both client- and server-side errors with one install and ships a `beforeSend` hook mechanism, which
is the concrete tool for satisfying spec FR-016 (error records must never contain photo bytes,
image-derived personal content, or other private data) — the scrubbing rule is enforced in
configuration at the point of capture, not left as a discipline every call site must remember.

**Alternatives considered**: Vercel's built-in Runtime Logs. Rejected as the sole solution — free on
Hobby, but not durably retrievable (short rolling retention, not designed as a queryable incident
record), which falls short of spec FR-015's "retrievable record" requirement. Building a bespoke
logging endpoint. Rejected — reinvents error grouping, retention, and PII-scrubbing tooling a
managed free tier already provides at this project's scale.

**Constraint carried into design**: the `beforeSend` scrubbing configuration is itself part of this
feature's deliverable, not an afterthought — it must be reviewed as carefully as any other
Principle VII-touching code, per the audit's own `F-D10-01` `principle_conflict` note.

---

## R5 — Testing approach for the feed fallback and route handlers (US3, US6)

**Decision**: Test `lib/serpapi.ts`'s exported functions and `app/api/feed/route.ts`'s exported
`GET` handler directly with Vitest, mocking `global.fetch`, rather than standing up a running server
or introducing a new testing framework.

**Rationale**: Next.js App Router route handlers are plain async functions —
`export async function GET(request: Request): Promise<Response>` — callable directly in a test with
a constructed `Request`, exactly as the constitution's Technology Constraints (Next.js 16 docs
consulted per `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`) describe
them. The existing test suite already establishes the pattern this feature extends: Vitest with a
lightweight fake (`MemoryStorage` in `tests/local-onboarding.test.ts`) standing in for a real
dependency (`localStorage`). Faking `global.fetch` for the SerpApi-unavailable case is the same
pattern applied to a different dependency. This directly satisfies spec FR-010 without adding new
tooling.

**Alternatives considered**: An end-to-end browser testing tool (e.g. Playwright) to exercise the
fallback through the full UI. Rejected for this specific requirement — FR-010 asks for an automated
test proving the *fallback data path* works when live search is unavailable, which is a unit/
integration-level concern the existing Vitest setup already handles; a browser-level tool is heavier
than this requirement needs and isn't otherwise present in the project.

---

## R6 — Voice connection timeout duration (US4)

**Decision**: A 10-second bounded wait for the voice connection attempt (`startVapiCall`) to reach
`call-start`, `call-end`, or `error` before the interface treats it as failed and offers the typed-
text fallback.

**Rationale**: This is an internal engineering judgment call, not sourced from a specific published
Vapi/Daily SLA — no such published connection-time guarantee was found. It is set noticeably longer
than the discovery-path timeout `SPEC.md:850` already establishes (SerpApi: 6 seconds), because a
voice connection additionally involves microphone-permission negotiation and WebRTC/Daily session
setup, both of which can legitimately take longer than a single HTTP round trip. It remains a hard,
bounded number rather than an unbounded wait, which is what spec FR-013 and Constitution Principle
IV require; the exact figure is an implementation parameter that can be tuned post-launch based on
observed real connection times (visible once R4's error monitoring is in place) without needing a
new decision process.

**Alternatives considered**: Matching the 6-second discovery-path timeout exactly. Rejected as too
tight for a flow that includes a permission prompt a shopper must physically respond to — a false
timeout while a shopper is still looking at the permission dialog would be a worse experience than
a slightly longer bound.

---

## Resolved unknowns summary

| Unknown | Resolution |
|---|---|
| Vision model + provider for real photo analysis | R1 — Groq `qwen/qwen3.6-27b`, already named in `SPEC.md`, free-tier-safe at this scale |
| CI provider | R2 — GitHub Actions, free and unlimited for this public repo |
| Lockfile fix | R3 — regenerate under the pinned `pnpm@11.2.2`, already proven to work during the audit |
| Error-monitoring service | R4 — Sentry free tier, with `beforeSend` scrubbing enforcing FR-016 |
| Test approach for the fallback/route handlers | R5 — Vitest against exported functions, extending the existing pattern, no new tooling |
| Voice connection timeout value | R6 — 10 seconds, a reasoned internal default, tunable post-launch once R4 gives visibility |
