---
name: update-deps
description: Update or audit dependencies in this dev-kit repository with compatibility-aware handling for the Effect v4 package family, @effect/vitest and Vitest, @yielded/effect-tsrs and its bundled tsrs compiler, Bun, and ordinary npm packages. Use when asked to update, refresh, audit, check, or pin dependency versions, regenerate bun.lock, refresh local upstream source checkouts, or resolve dependency/toolchain drift in this repository.
---

# Update Dependencies

Update dependencies as coupled toolchain groups, not as an undifferentiated
`latest` operation. Treat all target versions as live data and verify them from
primary sources at execution time.

## Establish the baseline

1. Read `package.json`, `bun.lock`, `tsconfig.json`, and the working-tree status.
2. Run the current `vp run check` and the narrowest relevant tests before
   changing versions. Record any pre-existing failures.
3. Inventory direct dependencies with `bun outdated` and exact registry data
   with `npm view`. Do not infer current versions from this skill.
4. Search every current version string with `rg` before editing. Version pins
   also live in source constants, tests, README examples, and generated setup
   locks.
5. Preserve unrelated user changes. Do not use destructive Git commands.

Before mutation, summarize the proposed groups, current versions, target
versions, compatibility evidence, and any release-line migration.

## Upgrade groups

### Effect v4 family

Keep these packages on one exact Effect v4 version:

- `effect`
- `@effect/platform-bun`
- `@effect/platform-node`
- `@effect/vitest`

Resolve the current v4 release line with registry dist-tags. This repository is
intentionally on Effect v4; never fall back to the v3 `latest` tag. Treat a
beta-to-stable transition as a migration that requires release-note and source
review, not as a mechanical bump.

For an Effect upgrade:

1. Verify that every required `@effect/*` package exists at the same exact
   version.
2. Check the matching canonical tag in `Effect-TS/effect` and update the
   ignored `.repos/effect` checkout to that exact tag. Never use `main` as
   evidence for installed behavior.
3. Inspect changed declarations and migration notes for APIs used under `src/`
   and `test/` before editing application code.
4. Confirm the installed `effect` package contains its version-matched
   `AGENTS.md` and linked guidance. Keep local Effect skills focused on project
   policy rather than copying package API documentation.
5. Keep `@effect/vitest` aligned with Effect, then verify its supported Vitest
   range and the version used by the matching Effect source checkout before
   changing `vitest`.

Use exact versions. Install the whole group in one package-manager operation so
the lockfile cannot represent a mixed beta set.

### Effect tsrs checker

`@yielded/effect-tsrs` bundles its own tsrs compiler and TypeScript standard
libraries. A separate `typescript` or `tsrs` package does not select that compiler.

For a checker upgrade:

1. Resolve the current published release from npm and its release documentation.
2. Inspect the exact release's bundled compiler metadata, supported Effect
   versions, Node requirement, and platform optional dependencies. Keep optional
   dependencies enabled; the current checker requires Node >=22.14.
3. Update the exact `@yielded/effect-tsrs` dev-dependency pin through `vp install`.
4. Run `vp run typecheck`. It invokes
   `effect-tsrs diagnostics --project tsconfig.json --strict`, checking both
   TypeScript and Effect diagnostics and treating warnings as failures.
5. Keep the `@effect/language-service` plugin name and its diagnostic options in
   `tsconfig.json`; Effect tsrs reads those options. Do not introduce TypeScript
   binary patching or change diagnostic severities to mask new failures.

The legacy `dev-kit tsgo patch` command and `src/effect-tsgo.ts` version constants
remain part of the toolbox's supported compatibility behavior. They do not select
this repository's checker; change them only for an explicit legacy-toolbox update.

### Other packages

Update independent packages separately from the coupled groups:

- `jsonc-parser`
- `tsx`
- `@types/node`
- `vitest`, subject to the `@effect/vitest` compatibility check above
- the `packageManager` Bun pin, only after confirming the intended Bun release

Read changelogs for major-version or runtime/tooling changes. Do not use
`bun update` as a substitute for deciding whether a release-line migration is
safe. Keep direct dependencies exact unless the repository policy changes.

## Apply changes

1. Upgrade one coupled group at a time with Bun and let Bun update `bun.lock`.
2. Make required source migrations immediately after each group so failures
   remain attributable.
3. Update all duplicated pins found by the initial `rg` search.
4. Do not manually rewrite lockfile entries.
5. Do not add lifecycle hooks per tool. Repository consumers have one
   manifest-driven `dev-kit apply --locked` postinstall; new setup behavior
   belongs under manifest `setup` tasks.
6. Keep this skill repository-local under `.agents/skills/update-deps`. Never
   add it to `skills/`, the distributed skill catalog, package `files`, or a
   vendored source manifest.

## Validate

Run all of the following after the final group:

```bash
vp run check
vp run typecheck
npm pack --dry-run --json
git diff --check
```

Also verify:

- `src/` still has no direct `node:*` imports outside an explicit runtime
  adapter or CLI composition boundary.
- all Effect v4 package versions are identical.
- the installed Effect tsrs CLI and its platform binary match the exact pin,
  and project checking preserves the configured diagnostic severities.
- the npm package contains the runtime implementation but does not contain
  `.agents/skills/update-deps`.
- `docs/dev-kit-plan.md` remains absent from staged and PR files.

Report the old and new versions by group, migrations made, source tags used,
validation results, and any dependency intentionally left unchanged with its
reason.
