# Tasks: Device-Local Onboarding

## Phase 1: Remove Infrastructure Requirement

- [x] T001 Remove Supabase/Zod dependencies, environment configuration, Proxy, auth/API routes, and migration
- [x] T002 Update root routing to render a client-local onboarding coordinator

## Phase 2: Local Persistence and Photo

- [x] T003 Define and implement the versioned `localStorage` contract in `lib/onboarding/local-store.ts`
- [x] T004 Implement client photo validation, compression, palette derivation, removal, and quota-safe errors
- [x] T005 Add local persistence/photo tests in `tests/local-onboarding.test.ts`

## Phase 3: Onboarding Screens

- [x] T006 Refactor profile setup to save name/photo locally with device-only copy
- [x] T007 Refactor “This you?” to consume exactly five local suggestions and persist explicit decisions
- [x] T008 Refactor billing to save a preference or defer without simulated connection
- [x] T009 Restore completed Style DNA from local state into the feed and add local profile reset

## Phase 4: Validation

- [x] T010 Run tests, lint, TypeScript, and production build
- [x] T011 Validate reload/resume through storage round-trip tests and a zero-configuration HTTP smoke check

## Phase 5: Onboarding Quality Pass

- [x] T012 Upgrade local storage to a backwards-safe multi-photo profile and extracted visual-signal model
- [x] T013 Implement real multi-image palette, saturation, brightness, contrast, texture, and diversity extraction
- [x] T014 Score a broad suggestion catalog from extracted signals and return exactly five explained cards
- [x] T015 Redesign profile, “This you?”, and billing screens as a cohesive minimalist mobile flow
- [x] T016 Add `/?onboarding=1` replay/reset behavior and a visible feed testing control
- [x] T017 Extend automated coverage for multi-image aggregation, personalized ranking, and replay reset
- [ ] T018 Run browser-based mobile visual/interaction QA and the full verification suite
- [x] T019 Expand profile setup with a full-width upload target, proper upload/privacy icons, and a large hero preview

## Phase 6: Filename-Driven Prototype

- [x] T020 Update the prototype contract for deterministic filename-keyword matching
- [x] T021 Match allow-listed shopping concepts from the local image filename without image inference
- [x] T022 Show concrete category imagery, including five denim-only directions for jean/denim filenames
- [x] T023 Add filename-ranking coverage and run the full verification suite
- [x] T024 Replace image inference requirements with deterministic filename-keyword matching
- [x] T025 Remove the browser model, worker, and model dependency
- [x] T026 Generate a five-card jeans-only deck for jean/denim filenames and generic cards for unknown names
- [x] T027 Add filename-matching coverage and run the full verification suite
- [x] T028 Add a local shirt-card catalog and balanced multi-concept selection
- [x] T029 Cover jeans-plus-shirts 3/2 mixing and run the full verification suite

## Order

T001–T004 establish the local-only contract. Screen work follows sequentially because the three screens share the coordinator state. T012–T014 establish the richer analysis contract before the quality-pass UI consumes it. Verification runs after all Supabase imports/routes are removed.
