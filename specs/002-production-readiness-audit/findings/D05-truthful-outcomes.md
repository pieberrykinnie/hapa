# D05 — Truthful Outcome Reporting

**Constitution**: Principle III ("Never Fail Loudly or Falsely")

**Verdict**: FAIL

## Findings

#### F-D05-01 — Every purchase unconditionally reports full success, including a fabricated "sent to email" receipt claim

- **Dimension**: D05
- **Severity**: S1 (blocks launch)
- **Kind**: INCORRECT
- **Verification**: VERIFIED
- **Free-tier feasible**: YES
- **Severity depends on assumption**: none — this is false today regardless of the real-money
  assumption, because the claim ("sent to email") is false the moment it is shown, independent of
  whether real money is involved.

**Evidence**
1. `CODE` — `components/purchase-flow.tsx:229` — the completed-order receipt panel unconditionally
   renders `<dd>Sent to email</dd>` under a "Receipt" label.
2. `ABSENT_ARTIFACT` — no email/mail/notification-sending code exists anywhere in `app/`,
   `components/`, or `lib/` (confirmed by repository-wide search) — no email is ever sent.
3. `CODE` — `components/hapa-provider.tsx:456-517` — `confirmPurchase`'s timer chain has exactly
   one terminal state: `stage: "done"`. `lib/types.ts:148` defines a `"failed"` stage on
   `PurchaseStage`, but no code path in `hapa-provider.tsx` ever sets it — it is unreachable.
4. `CODE` — `components/purchase-flow.tsx:249-253` — the completed screen additionally displays
   "{N} checkout steps verified" for steps that were narrated on a fixed timer
   (`lib/purchase-agent.ts:12-25`, `STEP_MS=900`), not independently verified against anything.

**Impact**
Every single purchase attempt — 100% of them, since no failure path is reachable — resolves to a
screen telling the shopper their order is confirmed, their payment method was charged, and a
receipt was emailed to them. None of that is true: no charge occurred (see **F-D04-01**), and no
email exists to send. This is the exact failure mode the launch target's constitution names as
non-negotiable to avoid: "Financial failures MUST show their real pending, failed, canceled, or
unknown state and MUST never be displayed as successful merely to protect the demo."

**Resolution condition**
The purchase-complete screen shows only claims the system can back up: no "sent to email" text
unless an email is actually sent, and a real failed/pending/unknown state is reachable and shown
accurately whenever the underlying (future real) payment result is anything other than a verified
success.

**Blocked by**: F-D04-01 (a truthful outcome requires a real outcome to report).
