# Next.js 16 docs index (T008)

`node_modules/next/dist/docs/` confirmed present. Guides relevant to this audit's scope:

| Guide | Relevance |
|---|---|
| `01-app/01-getting-started/15-route-handlers.md` | `app/api/feed/route.ts`, `app/api/products/gallery/route.ts` — D06, D12, D16 |
| `01-app/02-guides/authentication.md` | D01 — how Next.js 16 App Router expects auth boundaries to be structured |
| `01-app/02-guides/environment-variables.md` | D07 — server/client env var boundary (`NEXT_PUBLIC_*` prefix semantics) |
| `01-app/03-api-reference/03-file-conventions/route.md` | Route handler contract — D06, D12 |
| `01-app/03-api-reference/03-file-conventions/middleware.md` | D01 — session/auth middleware conventions (none present in this repo) |
| `01-app/01-getting-started/14-metadata-and-og-images.md` | `app/manifest.ts` — D14 |

Any finding asserting a Next.js 16 API is used incorrectly cites one of these paths directly
(constitution Technology Constraints).
