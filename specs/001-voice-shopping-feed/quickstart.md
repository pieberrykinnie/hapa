# Quickstart: Device-Local Onboarding

```bash
pnpm install
pnpm dev
```

Open `http://127.0.0.1:3001`. Port 3001 is intentional so HAPA does not collide with another local app already using port 3000. No Supabase project, migration, environment variable, or login email is required.

## Acceptance run

- Enter a name, skip photo, decide exactly five generic cards, defer billing, and reach the feed.
- Reset local profile, upload/preview/remove a supported photo, complete five locally photo-informed cards, choose a payment preference, and reach the feed.
- Reload at each step and confirm progress resumes from `localStorage`.
- Use visible buttons and Left/Right Arrow keys for equivalent decisions.
- Confirm every payment method is labeled setup-required/preference-only, never connected.

## Verification

```bash
pnpm test
pnpm lint
pnpm build
```
