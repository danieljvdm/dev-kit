---
"@danieljvdm/dev-kit": minor
---

Add the `setup.worktrunk.config` task, which scaffolds a default Worktrunk project config at `.config/wt.toml`: a copy-ignored-then-install `pre-start` pipeline, a full-validation `pre-merge` hook, and a commented per-worktree dev-server `post-start` block. Hook commands render for the repository's command runner—`vp install` and `vp run check` with a direct `vite-plus` dependency, otherwise the detected package manager's install command with `bun run check` from a declared root `check` script. The scaffold is created only when the file is missing and is never locked, updated, or removed; the repository owns it from creation.
