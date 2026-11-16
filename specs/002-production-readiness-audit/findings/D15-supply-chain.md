# D15 — Supply Chain and Reproducibility

**Verdict**: FAIL

## Findings

#### F-D15-01 — `pnpm install --frozen-lockfile` fails immediately: the lockfile is incompatible with the pinned package manager

- **Dimension**: D15
- **Severity**: S1 (blocks launch)
- **Kind**: INCORRECT
- **Verification**: VERIFIED
- **Free-tier feasible**: YES
- **Severity depends on assumption**: none

**Evidence**
1. `CODE` — `package.json` — `"packageManager": "pnpm@11.2.2"`.
2. `COMMAND_OUTPUT` — `findings/_provenance.md` — installed `pnpm --version` resolves to `11.2.2`
   (matching), but `pnpm-lock.yaml:1` declares `lockfileVersion: '6.0'`.
3. `COMMAND_OUTPUT` — `findings/_provenance.md` — `pnpm install --frozen-lockfile` fails with
   `[ERR_PNPM_LOCKFILE_BREAKING_CHANGE] Lockfile ... not compatible with current pnpm`, exit code 1.
   This is the exact command a new contributor, or any CI pipeline honoring `packageManager`, would
   run.

**Impact**
The reproducible-install path — the one a CI system or a careful new contributor would actually
use — is broken today. (`pnpm install` without `--frozen-lockfile` does work, but silently rewrites
the lockfile to a new format, which is itself evidence the committed lockfile is stale.)

**Resolution condition**
`pnpm install --frozen-lockfile` succeeds against the committed lockfile without modification.

**Blocked by**: none

---

#### F-D15-02 — Several devDependencies are a major version behind latest; none are exact-pinned

- **Dimension**: D15
- **Severity**: S3
- **Kind**: INCORRECT
- **Verification**: VERIFIED
- **Free-tier feasible**: YES

**Evidence**
1. `COMMAND_OUTPUT` — `pnpm install` output at audit time flagged: `framer-motion 12.43.0 (13.0.0
   available)`, `@types/node 20.19.43 (26.1.2 available)`, `eslint 9.39.5 (10.8.0 available)`,
   `typescript 5.9.3 (7.0.2 available)`, `vitest 3.2.7 (4.1.10 available)`.
2. `COMMAND_OUTPUT` — `pnpm audit` at audit time: "No known vulnerabilities found."

**Impact**
Routine maintenance debt, not a security exposure today (audit is clean). Worth tracking so it
doesn't compound.

**Resolution condition**
Dependencies are reviewed and updated on a regular cadence; not required before launch.

**Blocked by**: none
