# @danieljvdm/dev-kit

## 1.0.0

### Major Changes

- 0caa455: Replace persistent project reconciliation with agent-led, repo-owned setup. Add
  manifestless skill installation and provenance-aware updates, ship a conservative
  `eject` migration for v1 managed projects, and remove the manifest manager and
  importable configuration API from the published package.

## 0.18.0

### Minor Changes

- f953091: Vendor anti-slop, export its Oxlint plugin, and enable its low-evidence rules in the recommended lint preset.

### Patch Changes

- 946ef3b: Update the Effect v4 beta family to beta.107 and Effect TypeScript-Go to 0.36.4 while preserving its commit-matched TypeScript 7.0.2 compiler.

## 0.17.0

### Minor Changes

- 96a7d40: Approve Sentry's official agent skills from `getsentry/agent-plugin` in the external skill catalog.

## 0.16.0

### Minor Changes

- 253086d: Add opt-in absolute (path-alias) import enforcement: `createRecommendedVitePlusConfig({ absoluteImports: { files } })` appends an Oxlint override scoping `import/no-relative-parent-imports` to the given globs, and `createAbsoluteImportsOxlintOverride` exposes the same override for standalone Oxlint configs.
- 45ff273: Share skill-source and Effect-source downloads through a machine-global cache.

  Catalog source checkouts now materialize into `$XDG_CACHE_HOME/dev-kit`
  (`~/Library/Caches/dev-kit` on macOS, `~/.cache/dev-kit` elsewhere, overridable
  with `DEV_KIT_CACHE_DIR`) keyed by source id and resolved commit SHA, instead
  of the per-project `.dev-kit/cache`. A fresh git worktree with the same pinned
  sources applies without any network access, and `dev-kit plan` no longer
  re-fetches catalog sources on every run — the dry-run path reads and populates
  the same cache. Cache population stages into a temp sibling and renames
  atomically, so concurrent applies from different worktrees are safe. Because
  entries are immutable and commit-keyed, populating the cache is not project
  state; planning and `--locked` verification use it without violating their
  read-only project semantics.

  The `setup.effectSource` checkout keeps its per-project `.repos/effect`
  working copy but clones and fetches tags from a shared cached repository in
  the same global cache, contacting the network only when a tag is missing from
  the cache.

  The cache does not grow without bounds. Every use refreshes a recency stamp;
  `dev-kit apply` sweeps content unused for 30 days at most once a day, dropping
  stale catalog entries and unused Effect tags (removing a shared repository
  entirely once it holds no tags). The new `dev-kit cache prune` command sweeps
  on demand, with `--max-age-days` to tune the threshold and `--all` to clear
  the cache entirely. Eviction is always safe: entries are regenerable and are
  re-fetched on next use.

  Stale project-local `.dev-kit/cache/catalog` directories left by earlier
  versions are removed on apply (best effort); they were regenerable and are no
  longer read.

- 129e052: Split the consumer half of `build-effect-apis` into a new `effect-atom-state` skill so client-side work actually triggers it.

  - New `effect-atom-state` skill owns Effect Atom client state and React integration: deriving `AtomHttpApi`/`HttpApiClient` clients, query/mutation atoms, reactivity keys, `Atom.fn` workflows, optimistic updates, lifecycle, testing, and TanStack Start. Its description triggers on writing or refactoring React components that read or dispatch atoms — the case the old server-flavored description never matched. The skill body carries the Effect→Promise boundary doctrine: business logic stays in Effect, promise-mode dispatches are returned bare to promise-shaped leaf components, multi-step workflows compose atoms through the fn context, cross-query invalidation is declared as reactivity keys, and optimistic state lives in `Atom.family` atoms.
  - `build-effect-apis` keeps the contract spine and server: shared contracts, handlers and middleware, runtime assembly, Cloudflare Workers, and verification. It routes consumer changes to `$effect-atom-state`. The `effect` family now installs both.
  - `setup.agentInstructions` renders a terse Effect Atom client boundary section into the managed AGENTS.md when the project (or one of its workspace packages) depends on `@effect/atom-react`.

## 0.15.0

### Minor Changes

- 60cb47a: Introduce create-only scaffolds: setup tasks that apply a template once and then leave the file to the repository — never locked, compared, updated, or removed.

  - New `setup.worktrunk.config` scaffolds a default Worktrunk project config at `.config/wt.toml`: a copy-ignored-then-install `pre-start` pipeline, a full-validation `pre-merge` hook, and a commented per-worktree dev-server `post-start` block. Hook commands render for the repository's command runner — `vp install` and `vp run check` with a direct `vite-plus` dependency, otherwise the detected package manager's install command with `bun run check` from a declared root `check` script.
  - **Breaking:** the managed GitHub Actions check workflow became a scaffold. The manifest key moved from `setup.vitePlus.quality.workflow` to `setup.vitePlus.workflow`, and the `beforeChecks` and `typecheck` options were removed — edit the scaffolded YAML directly instead. On upgrade, existing `setup:vite-plus-github-actions` lock entries and receipts are discarded and `.github/workflows/check.yml` becomes repository-owned; re-apply any `beforeChecks`/`typecheck` customization by editing the file.
  - **Breaking:** removed the raw-file-mode digest fallback that adopted locks written by dev-kit ≤0.6. If a locked verification fails after upgrading from those versions, run one unlocked `dev-kit apply` and commit the regenerated lock.

## 0.14.0

### Minor Changes

- 7faee08: Add `open-pull-request`, a model-triggered workflow for conventional commits, terse context-complete PR descriptions, and verified screenshots or other proof of work.

### Patch Changes

- 7faee08: Require every script and CLI in Effect repositories—including existing plain-TypeScript scripts being modified and CI/deploy/build automation—to use Effect unless a concrete exception is explicitly stated.

## 0.13.0

### Minor Changes

- 0a3ef5d: Add `build-effect-clis`, an opinionated Effect CLI development skill included in the `effect` family.

### Patch Changes

- 3934302: Fix package-skill path migrations, reject obsolete manifest fields, flatten the
  recommended lint preset for Vite+ consumers, document its current JS-plugin
  limit, and publish the recommended Effect TS-Go diagnostic profile.

## 0.12.0

### Minor Changes

- aaa9ad0: Delegate general Effect guidance to the installed package, add a focused Effect architecture audit skill, retain the contract-first API development skill, and generate version-matched Effect instructions for direct dependencies that ship `node_modules/effect/AGENTS.md`.
- 1c1f0f2: Keep `vite.config.ts` project-owned and add a composable Vite+ quality factory with aligned lint/format ignores.
- f29a3f9: Install package-bundled skills under package-qualified directory names. A selected `<package>#<skill>` now installs by flattening the package name (drop `@`, turn every other non-alphanumeric run into one dash) and appending the skill name, so `@tanstack/table-core#core` installs as `tanstack-table-core-core` instead of the collision-prone bare `core`. The copied `SKILL.md` frontmatter `name:` is rewritten to the same install name; manifest selectors, CLI listings, and the lock's catalog provenance keep the original `<package>#<skill>` identity, bare skill name, and `node_modules` content digest. Symlink-mode targets still link into `node_modules`, so only the link name carries the qualifier. On the next apply, previously installed bare-name package-skill directories are renamed through the normal plan and the lock regenerates.

### Patch Changes

- 4fe327c: Update Effect TypeScript-Go to 0.33.0, enable stricter Effect diagnostics, adopt their recommended Schema and JSON APIs, and migrate stale compiler patches safely.

## 0.11.3

### Patch Changes

- 1926864: Clarify Effect Atom React hook ownership, interruption cleanup, and durable multi-step action guidance.
- c9ea09d: Prefer inline type specifiers and merge mixed type and value imports in the recommended Oxlint preset.

## 0.11.2

### Patch Changes

- e50051d: Use readable release tags for the third-party actions in the managed Vite+ check workflow.

## 0.11.1

### Patch Changes

- ad4060b: Point generated agent instructions at the project-managed Dev Kit skill instead of a package-manager-internal source path.

## 0.11.0

### Minor Changes

- b7ebbdd: Require Bun 1.3 or newer for the Dev Kit CLI, run its Effect program on the Bun platform, and execute TypeScript natively without `tsx`.
- f95ccd6: Manage Dev Kit instructions within an existing `AGENTS.md`, preserving handwritten project guidance across updates and cleanup. Generate an opinionated command policy that synthesizes non-conflicting Vite+ guidance for direct Vite+ projects and runs declared scripts in non-Vite+ projects through Bun, independently of the dependency installer. Safely remove legacy owned Vite+ instruction sections instead of continuing to import the generic upstream block.

## 0.10.0

### Minor Changes

- b445126: Approve Expo's official framework and EAS skills from `expo/skills` in the external skill catalog.

## 0.9.0

### Minor Changes

- 569ddd4: Add a high-bar `testing` skill and approve the upstream `tdd` and `improve-codebase-architecture` skills.

## 0.8.0

### Minor Changes

- fddf528: Expand the `effect-ts` umbrella with lazy Effect DateTime and Effect Atom references. The DateTime guidance prefers Effect DateTime over JavaScript Date for domain logic and covers parsing, schemas, time zones, arithmetic, formatting, interoperability, and deterministic `TestClock` tests. The existing `effect-atom-data-fetching` selector remains as a compatibility alias.

### Patch Changes

- 2c51b1d: Let Vite+ quality consumers independently opt into managed config or workflow resources, including repository-specific workflow preparation and typecheck commands.

## 0.7.2

### Patch Changes

- d50151b: Make opt-in Vite+ quality CI deterministic with one frozen install, locked Dev Kit convergence, compatible consumer Vite+ validation, and explicit single-project or workspace typechecking.

## 0.7.1

### Patch Changes

- 28c7338: Allow a committed lock to re-establish ownership and update unchanged managed outputs when local state is absent, including locks written before file-mode digest normalization.

## 0.7.0

### Minor Changes

- 8fd5e6f: Add opt-in Vite+ Git hook and quality convergence, including worktree-local dispatcher setup, digest-owned canonical config and GitHub Actions files for supported Effect repositories, and readable statement spacing in the shared Oxlint preset.

### Patch Changes

- a43887e: Make Effect TypeScript-Go patch detection converge across npm, pnpm, and Bun installs.
- 091a24e: Normalize regular file permissions to Git executable semantics when digesting managed paths, preventing catalog integrity false positives across different umasks.

## 0.6.0

### Minor Changes

- c67a1e9: Add an opt-in managed `AGENTS.md` wrapper with dev-kit guidance, conditional
  Vite+ instructions for direct dependencies, and atomic `CLAUDE.md` symlink
  support.
- 6dae6a3: Add a bundled `effect-atom-data-fetching` skill for React cache lifecycle, HTTP queries and mutations, invalidation, SSR boundaries, framework integration, and deterministic testing.

### Patch Changes

- 355ca42: Recommend automatic lifecycle applies for dependency upgrades while reserving locked mode for strict CI verification.

## 0.5.0

### Minor Changes

- c484992: Add a manifest-managed `CLAUDE.md` symlink to project-root `AGENTS.md` with lockfile ownership and conflict-safe cleanup.
- f57b12d: Discover Intent-style skills in installed direct dependencies and expose them
  through package-qualified selectors. Package skills remain browse-only until
  the user explicitly adds one, and selected package versions and content are
  recorded in the project lock.

## 0.4.0

### Minor Changes

- 2864a3c: Add canonical Oxlint and Oxfmt configurations that work with both standalone Oxc tools and Vite+, and publish Egte's reusable Effect lint rules as a shared Oxlint JavaScript plugin.

## 0.3.3

### Patch Changes

- 221eab6: Remove the obsolete `check:scripts` command from the generated Effect CLI guide.

## 0.3.2

### Patch Changes

- 17950fe: Keep the recommended type-aware preset focused by disabling incidental default warnings and allowing test assertions to use non-null narrowing.

## 0.3.1

### Patch Changes

- deb451c: Ship the Oxlint preset as JavaScript at runtime so Vite+ can load it from node_modules.

## 0.3.0

### Minor Changes

- 736aa78: Add a typed, composable recommended Oxlint preset for Vite+ projects.

## 0.2.3

### Patch Changes

- 835fb15: Teach project agents to derive a capability inventory from repository evidence
  and choose focused skills instead of generic umbrellas or whole source families.

## 0.2.2

### Patch Changes

- 3180d85: Regenerate the dogfood lock whenever Changesets bumps the package version. Guide
  consumers toward individually relevant external skills, show source provenance
  while browsing, and warn when source-family shorthand selects an entire source.

## 0.2.1

### Patch Changes

- 60bdf42: Add Changesets-based versioning and automated npm releases.
- 9100138: Harden project initialization, catalog refresh locking, and late apply race detection.
