# `pnpm build` (T004)

**Result**: SUCCESS. Exit 0.

```
$ next build --webpack
▲ Next.js 16.3.0 (webpack)
✓ Compiled successfully in 26.9s
  Running TypeScript ...
  Finished TypeScript in 9.5s ...
  Collecting page data using 8 workers ...
✓ Generating static pages using 8 workers (7/7) in 1826ms
  Finalizing page optimization ...
  Collecting build traces ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /api/feed
├ ƒ /api/products/gallery
└ ○ /manifest.webmanifest

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

Zero TypeScript errors, zero build errors. Five routes total: 3 static, 2 dynamic (both API routes).
The constitution states "`pnpm build` passing with zero TypeScript errors is a precondition for
merge" — that bar is currently met on this commit.
