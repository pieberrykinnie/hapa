# Provenance (T002)

- **Commit**: `1586575d7845200bdd763047ec6ccc5ba713194a`
- **Branch**: `claude/github-spec-kit-setup-c32681`
- **Assessed at**: 2026-08-06T03:54:10Z
- **Working tree at start**: clean (`git status --porcelain` empty)

## T001 — Dependency install

- `pnpm install --frozen-lockfile` **FAILED**:
  ```
  [ERR_PNPM_LOCKFILE_BREAKING_CHANGE] Lockfile pnpm-lock.yaml not compatible with current pnpm
  Run with the --force parameter to recreate the lockfile.
  ```
  Exit code 1. `package.json` declares `"packageManager": "pnpm@11.2.2"`; the installed `pnpm`
  resolves to `11.2.2` (matching); but the committed `pnpm-lock.yaml` declares
  `lockfileVersion: '6.0'`, a format pnpm 11.2.2 cannot read without rewriting it. This is the exact
  command a new contributor or a CI system following `packageManager` would run, and it fails
  out of the box. Filed as a finding under D15.
- To unblock evidence-gathering for later phases (build/test/lint, Next.js docs), ran
  `pnpm install --no-frozen-lockfile` instead. This **rewrote `pnpm-lock.yaml`** to a new lockfile
  format (2,987 insertions / 2,480 deletions). Per the audit's non-mutation constraint (spec
  FR-031), the rewritten lockfile was immediately reverted with `git checkout -- pnpm-lock.yaml`.
  `node_modules/` remains installed (gitignored, untracked) and was used for all subsequent
  verification commands and for `node_modules/next/dist/docs/`.
- Working tree confirmed clean outside `specs/` after the revert:
  `git status --porcelain -- . ':!specs/'` → empty.

## Note excluded from findings

`corepack --version` failed on this host with a Windows-path shim error
(`/mnt/c/Program Files/nodejs/corepack: bad interpreter`). This is a local development-machine
PATH artifact, not a property of the repository, and is excluded from findings accordingly.
