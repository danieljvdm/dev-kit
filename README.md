# Dev Kit

Agent-led TypeScript repository setup and a curated catalog of portable coding
skills.

Dev Kit is a transient toolbox. It copies guidance into a repository, helps an
agent build the requested setup against the repository's real constraints, and
then gets out of the way. Generated source, configuration, workflows, scripts,
and skills belong to the repository that receives them.

The finished repository has no Dev Kit dependency, manifest, lock, ownership
state, postinstall manager, or CI reconciliation step.

The package intentionally exposes no importable JavaScript API. Its public
surface is the transient executable and the guidance or skills it copies.

## Set up a repository

From a new or existing repository, copy the Dev Kit setup skill:

```bash
bunx @danieljvdm/dev-kit@latest setup
```

This writes `.agents/skills/dev-kit` and a small origin receipt inside that skill.
It does not edit `package.json` or create project-wide Dev Kit metadata.

Then ask the coding agent for the outcome:

> Use $dev-kit to set up this repository as a Vite+ TypeScript monorepo with an
> Effect-based Cloudflare Worker API and a web application.

The skill inventories the repository, loads only the applicable setup references,
resolves material product decisions, implements ordinary repo-owned files, and
validates through the resulting repository's own commands.

For an empty directory, the agent establishes the package and toolchain foundation
before consulting documentation shipped by the installed dependencies. For an
existing repository, it integrates with established package boundaries, scripts,
configuration, and CI instead of replacing them with a fixed template.

## The ownership contract

Dev Kit commands are transactions, not reconciliation:

- `setup` copies the agent-led setup skill once.
- `skills add` copies selected skills once.
- `skills update` refreshes an unchanged tracked skill when requested.
- `eject` releases projects created by the legacy managed model.
- toolbox commands perform an explicit diagnostic or mechanical operation.

Git records the resulting project state. Dev Kit does not remember the desired
shape of the repository and does not silently rewrite configuration after setup.

## Commands

| Command                                        | Purpose                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------ |
| `dev-kit setup`                                | Copy the agent-led Dev Kit skill into `.agents/skills`.            |
| `dev-kit skills list --all`                    | Browse built-in, approved Git, and installed-package skills.       |
| `dev-kit skills search <words...>`             | Search skill names, descriptions, and sources.                     |
| `dev-kit skills info <skill>`                  | Show one skill's description and provenance.                       |
| `dev-kit skills add <skill...>`                | Copy repo-owned skills without a manifest.                         |
| `dev-kit skills status`                        | Compare tracked copies with their approved upstream content.       |
| `dev-kit skills update [skill...]`             | Fast-forward tracked skills that have no local edits.              |
| `dev-kit skills diff <skill>`                  | Diff a repository copy against the latest approved upstream.       |
| `dev-kit skills update <skill> --accept-local` | Keep an agent-merged copy and advance its upstream base.           |
| `dev-kit skills detach <skill...>`             | Remove origin receipts while preserving local content.             |
| `dev-kit eject [--dry-run]`                    | Release a legacy managed project into repo ownership.              |
| `dev-kit effect sync`                          | Explicitly sync an Effect source checkout to an installed version. |
| `dev-kit tsgo patch`                           | Explicitly patch the installed Effect TypeScript-Go compiler.      |
| `dev-kit cache prune`                          | Remove stale machine-global catalog checkouts.                     |

Commands that write project skills accept `--project-dir`, `--target`, and
`--dry-run`. The default target is `.agents/skills`.

Run any command with `--help` for its complete flags.

## Skills

Dev Kit combines three sources:

- skills bundled with this package;
- exact commits from an approved external Git catalog; and
- skills discovered in direct project dependencies that expose compatible
  package metadata.

Search the catalog before copying:

```bash
bunx @danieljvdm/dev-kit@latest skills search cloudflare
bunx @danieljvdm/dev-kit@latest skills info workers-best-practices
bunx @danieljvdm/dev-kit@latest skills add workers-best-practices wrangler
```

Source families select every approved skill from one source and are intentionally
broad. Prefer individual skills unless every family member applies.

Package skills use the exact `<package>#<skill>` selector:

```bash
bunx @danieljvdm/dev-kit@latest skills add @tanstack/ai#ai-core
```

The package must already be a direct, installed dependency. Dev Kit never
downloads a missing package or executes package-provided discovery code.

### Origin receipts

Each copied skill contains `.dev-kit-origin.json`:

```text
.agents/skills/workers-best-practices/
├── SKILL.md
├── references/
└── .dev-kit-origin.json
```

The receipt identifies that artifact's selector, approved source, and base
digest. It does not enumerate other skills, express desired project state, or
run automatically.

An unmodified tracked skill can fast-forward safely:

```bash
bunx @danieljvdm/dev-kit@latest skills status
bunx @danieljvdm/dev-kit@latest skills update
```

When both the repository and upstream changed, Dev Kit preserves the local copy:

```bash
bunx @danieljvdm/dev-kit@latest skills diff workers-best-practices
```

Ask the agent to merge applicable upstream intent. After reviewing the merged
skill, advance its recorded base without overwriting it:

```bash
bunx @danieljvdm/dev-kit@latest skills update workers-best-practices --accept-local
```

To sever the upstream relationship entirely:

```bash
bunx @danieljvdm/dev-kit@latest skills detach workers-best-practices
```

Only the receipt is removed. The skill remains ordinary repository content.

## Eject a legacy managed project

Projects from the previous Dev Kit model may contain:

- `dev-kit.jsonc`;
- `dev-kit.lock.json`;
- `.dev-kit/state.json`;
- managed sections in `AGENTS.md`;
- `dev-kit apply` lifecycle or CI commands; and
- runtime imports such as `@danieljvdm/dev-kit/vite-plus`.

Preview the migration directly:

```bash
bunx @danieljvdm/dev-kit@latest eject --dry-run
```

Dry-run reports recurring behaviors that still need repo-owned replacements.
Typical examples are local Vite+/Oxlint/Oxfmt configuration, Effect compiler
patching, source checkouts, and Git hook generation.

After the agent materializes those behaviors, run:

```bash
bunx @danieljvdm/dev-kit@latest eject
```

The command:

- preserves and releases managed agent instructions;
- converts safe legacy skill outputs into repo-owned copies with origin receipts;
- removes the Dev Kit dependency and pure apply scripts;
- removes the known legacy CI verification step; and
- deletes the manifest, lock, and local ownership receipt.

It stops before writing when a managed setup task, runtime import, ambiguous
script, modified destination, unsafe path, or malformed marker still needs human
or agent judgment. Regenerate the package-manager lockfile and run the full
repository validation after ejection.

## Approved catalog maintenance

External skill sources are authored in `skill-sources.jsonc` and approved as
exact commits in `skill-sources.lock.json`. These are package-maintainer files,
not consumer project state.

| Command                                    | Purpose                                               |
| ------------------------------------------ | ----------------------------------------------------- |
| `dev-kit catalog add <repository>`         | Inspect a repository and approve selected skills.     |
| `dev-kit catalog remove <source-or-skill>` | Revoke an approval.                                   |
| `dev-kit catalog list`                     | List approved sources.                                |
| `dev-kit catalog info <source>`            | Show one source's commit and skills.                  |
| `dev-kit catalog refresh`                  | Advance approved refs and regenerate the snapshot.    |
| `dev-kit catalog verify`                   | Verify the committed snapshot without advancing refs. |

Resolved external content is cached machine-wide by immutable commit. Project
skill copies remain independent of that cache.

## Development

This repository uses Vite+ as its command authority:

```bash
vp install
vp run check
```

The package's own `prepare` script explicitly syncs its Effect source checkout,
patches Effect TypeScript-Go, and configures Vite+ Git hooks. Those are local
development operations for Dev Kit itself, not a consumer management model.

The v1 decoder exists only behind `eject`. Repository-setup behavior belongs in
`skills/dev-kit` as concise agent instructions and progressively disclosed
references. Deterministic CLI code is reserved for catalog, provenance,
migration, validation, and other mechanics where a free-form agent edit would
be unsafe.
