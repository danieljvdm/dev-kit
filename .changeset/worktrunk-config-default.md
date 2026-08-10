---
"@danieljvdm/dev-kit": minor
---

Introduce create-only scaffolds: setup tasks that apply a template once and then leave the file to the repository — never locked, compared, updated, or removed.

- New `setup.worktrunk.config` scaffolds a default Worktrunk project config at `.config/wt.toml`: a copy-ignored-then-install `pre-start` pipeline, a full-validation `pre-merge` hook, and a commented per-worktree dev-server `post-start` block. Hook commands render for the repository's command runner — `vp install` and `vp run check` with a direct `vite-plus` dependency, otherwise the detected package manager's install command with `bun run check` from a declared root `check` script.
- **Breaking:** the managed GitHub Actions check workflow became a scaffold. The manifest key moved from `setup.vitePlus.quality.workflow` to `setup.vitePlus.workflow`, and the `beforeChecks` and `typecheck` options were removed — edit the scaffolded YAML directly instead. On upgrade, existing `setup:vite-plus-github-actions` lock entries and receipts are discarded and `.github/workflows/check.yml` becomes repository-owned; re-apply any `beforeChecks`/`typecheck` customization by editing the file.
- **Breaking:** removed the raw-file-mode digest fallback that adopted locks written by dev-kit ≤0.6. If a locked verification fails after upgrading from those versions, run one unlocked `dev-kit apply` and commit the regenerated lock.
