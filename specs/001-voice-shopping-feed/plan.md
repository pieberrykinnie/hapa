# Implementation Plan: Device-Local Onboarding

**Branch**: `feat/onboarding-process` | **Date**: 2026-08-05 | **Spec**: [spec.md](./spec.md)

## Summary

Implement the onboarding run entirely in the browser: required name, optional compressed photo preview, exactly five explicit style decisions, payment preference or defer, and feed handoff. A versioned `localStorage` document is authoritative for this prototype. There is no login, server profile API, cloud photo upload, or provider connection.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19.2, Next.js 16.3  
**Primary Dependencies**: Next.js, Framer Motion, Tailwind CSS 4  
**Storage**: Browser `localStorage`; compressed photo data URL  
**Testing**: Vitest, ESLint, TypeScript, production build  
**Target Platform**: Modern mobile browser/PWA on one device  
**Constraints**: local data can be cleared by the browser; no authentication or cross-device sync; prototype personalization uses deterministic filename keywords rather than pixel inference; payment selections are preferences only; no raw payment credentials

## Constitution Check

- Local Prototype Exception: PASS. The feature spec explicitly declares Prototype Mode.
- Private photo input: PASS. Photo stays in-browser, is compressed before persistence, and can be removed/reset.
- Financial truthfulness: PASS. Methods are labeled preference/setup-required, never connected or available.
- Human purchase authorization: PASS/N/A. This change does not add payment submission.

## Structure

```text
app/page.tsx
components/local-onboarding-app.tsx
components/onboarding/{ProfileSetup,ThisYouDeck}.tsx
components/billing/BillingReadiness.tsx
lib/onboarding/{local-store,rules,billing,constants}.ts
tests/
```

No API, Proxy, authentication provider, database, migration, or environment configuration is required.
