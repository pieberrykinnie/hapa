# D08 — Automated Quality Gates

**Verdict**: FAIL

## Findings

#### F-D08-01 — No CI of any kind exists; the constitution's stated merge bar is enforced by nobody but a human

- **Dimension**: D08
- **Severity**: S1 (blocks launch)
- **Kind**: MISSING
- **Verification**: VERIFIED
- **Free-tier feasible**: YES
- **Severity depends on assumption**: none

**Evidence**
1. `ABSENT_ARTIFACT` — no `.github/` directory exists in the repository root (confirmed via
   directory listing at audit time).
2. `CODE` — `.specify/memory/constitution.md:129-130` — "`pnpm build` passing with zero TypeScript
   errors is a precondition for merge" — a requirement with no mechanical enforcement anywhere.
3. `COMMAND_OUTPUT` — `findings/_cmd-build.md`, `findings/_cmd-test.md`, `findings/_cmd-lint.md` —
   all three commands pass cleanly on this commit when run manually, demonstrating the gate is
   currently met by luck/discipline, not by automation.

**Impact**
Nothing stops a future commit that breaks the build, fails tests, or fails lint from being merged.
The constitution's own merge bar exists only as a sentence someone has to remember to honor.

**Resolution condition**
A CI workflow runs `pnpm build`, `pnpm test`, and `pnpm lint` on every push/PR and merging is
blocked when any of them fail.

**Blocked by**: F-D15-01 (a CI pipeline built on `pnpm install --frozen-lockfile` would itself fail
immediately until the lockfile/packageManager mismatch is fixed — see D15).
