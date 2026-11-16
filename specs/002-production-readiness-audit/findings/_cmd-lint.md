# `pnpm lint` (T006)

**Result**: SUCCESS with 1 warning, 0 errors. Exit 0 (warnings do not fail the command).

```
$ eslint

components/feed.tsx
  141:9  warning  'showShiftingSpinner' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (0 errors, 1 warning)
```

Lint is clean enough to not block a merge under the constitution's stated bar (which only names
`pnpm build`), but the warning is real, unaddressed dead state in `components/feed.tsx:141`.
