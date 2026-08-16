# Dev Kit

This package is a transient repository-setup toolbox and curated skill catalog.
Its primary setup behavior lives in `skills/dev-kit/SKILL.md` and its disclosed
references. Generated repository files are always repo-owned; new features must
not introduce a consumer manifest, lock, ownership state, lifecycle manager, or
runtime dependency on Dev Kit.

Before changing repository setup or skill-sync behavior, read
`skills/dev-kit/SKILL.md` completely and follow its applicable references.

The v1 project decoder exists only behind `dev-kit eject`. Keep that code scoped
to the explicitly supported migration and do not expose the old manager surface.

# Learning more about the Effect

This repository uses the Effect Typescript library.

Before writing any Effect code, first read `node_modules/effect/AGENTS.md`
**completely**, and follow the links in the file when required.

If you need to learn more about particular Effect apis and concepts that the
guide doesn't cover, search through the source code in `node_modules/effect/src`.

## Project command policy

Vite+ is the unified toolchain and command authority for this repository. It wraps Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task behind the `vp` CLI; Vite+ is distinct from Vite.

Run `vp help` for available commands and `vp <command> --help` for command-specific options. Documentation is available locally in `node_modules/vite-plus/docs` and online at https://viteplus.dev/guide/.

Use these repository commands:

- Install dependencies: `vp install`.
- Full validation: `vp run check`.
- Static checks: `vp check`.
- Format check: `vp fmt --check`; format fixes: `vp fmt`.
- Lint only: `vp lint`; lint fixes: `vp lint --fix`.
- Tests only: `vp test`.
- Typecheck only: `vp run typecheck`.
- Other repository tasks and package scripts: `vp run <task>`.
- Toolchain or runtime troubleshooting: run `vp env doctor` and include its output when asking for help.

Do not use `bun run`, `npm run`, `pnpm run`, or `yarn run` in this repository. Do not invoke underlying tools such as `tsc`, `vitest`, `oxlint`, or `oxfmt` directly; use the Vite+ entry points above.

# Testing policy

Do not add tests proactively. Write a test only when a human asks for one, or
when red/greening a real breakage: reproduce the failure as a failing test, fix
it, and keep that test as the regression guard. The same applies to a genuinely
load-bearing seam a human has called out. Every test in the suite must be
traceable to a breakage or an explicit request — otherwise build it, verify it
works in the running app, and move on.
