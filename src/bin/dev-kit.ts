import { BunRuntime, BunServices } from "@effect/platform-bun";
import { Effect, Result } from "effect";
import { Argument, CliError, Command as CliCommand, Flag } from "effect/unstable/cli";

import {
  addCatalogSource,
  listCatalogSources,
  removeCatalogEntry,
  showCatalogSource,
} from "../catalog-manager.ts";
import { printError } from "../cli-ui.ts";
import { syncEffectSource } from "../effect-source.ts";
import { patchEffectTsgo } from "../effect-tsgo.ts";
import { runEject } from "../eject.ts";
import { patchProjectGitignore } from "../gitignore.ts";
import { CACHE_PRUNE_AGE_DAYS, runCachePrune } from "../global-cache.ts";
import {
  addProjectSkills,
  detachProjectSkills,
  diffProjectSkill,
  listProjectSkills,
  setupProject,
  showProjectSkill,
  showProjectSkillsDashboard,
  statusProjectSkills,
  updateProjectSkills,
} from "../project-skills.ts";
import { DEV_KIT_VERSION } from "../tool-metadata.ts";
import { refreshSkillCatalog } from "../vendor.ts";

const repositorySkillFlags = {
  projectDir: Flag.string("project-dir").pipe(
    Flag.withDefault("."),
    Flag.withDescription("Project directory (defaults to the current directory)."),
  ),
  target: Flag.string("target").pipe(
    Flag.withDefault(".agents/skills"),
    Flag.withDescription("Project-relative skills directory."),
  ),
};

const setupCommand = CliCommand.make(
  "setup",
  {
    dryRun: Flag.boolean("dry-run").pipe(Flag.withDescription("Preview without writing.")),
    ...repositorySkillFlags,
  },
  ({ dryRun, projectDir, target }) => setupProject({ dryRun, projectDir, target }),
).pipe(
  CliCommand.withDescription(
    "Copy the agent-led Dev Kit setup skill into a repository without adding a dependency.",
  ),
);

const ejectCommand = CliCommand.make(
  "eject",
  {
    dryRun: Flag.boolean("dry-run").pipe(Flag.withDescription("Preview without writing.")),
    lockfile: Flag.string("lockfile").pipe(
      Flag.withDefault("dev-kit.lock.json"),
      Flag.withDescription("Project-relative legacy lock path."),
    ),
    manifest: Flag.string("manifest").pipe(
      Flag.withDefault("dev-kit.jsonc"),
      Flag.withDescription("Project-relative legacy manifest path."),
    ),
    projectDir: Flag.string("project-dir").pipe(
      Flag.withDefault("."),
      Flag.withDescription("Legacy project directory."),
    ),
    state: Flag.string("state").pipe(
      Flag.withDefault(".dev-kit/state.json"),
      Flag.withDescription("Project-relative legacy ownership receipt."),
    ),
    target: Flag.string("target").pipe(
      Flag.withDefault(".agents/skills"),
      Flag.withDescription("Project-relative destination for ejected skills."),
    ),
  },
  ({ dryRun, lockfile, manifest, projectDir, state, target }) =>
    runEject({
      dryRun,
      lockfilePath: lockfile,
      manifestPath: manifest,
      projectDir,
      statePath: state,
      target,
    }),
).pipe(
  CliCommand.withDescription(
    "Release a legacy managed project into repo-owned files after persistent helpers are materialized.",
  ),
);

const projectSkillsAddCommand = CliCommand.make(
  "add",
  {
    skills: Argument.string("skills").pipe(Argument.variadic({ min: 1 })),
    dryRun: Flag.boolean("dry-run").pipe(Flag.withDescription("Preview without writing.")),
    ...repositorySkillFlags,
  },
  ({ skills, dryRun, projectDir, target }) =>
    addProjectSkills(skills, { dryRun, projectDir, target }),
).pipe(CliCommand.withDescription("Copy repo-owned skills from the approved catalog."));

const projectSkillsListCommand = CliCommand.make(
  "list",
  {
    all: Flag.boolean("all").pipe(Flag.withDescription("Include uninstalled skills.")),
    ...repositorySkillFlags,
  },
  ({ all, projectDir, target }) => listProjectSkills({ all, projectDir, target }),
).pipe(CliCommand.withDescription("List installed skills or browse the catalog."));

const projectSkillsSearchCommand = CliCommand.make(
  "search",
  {
    query: Argument.string("query").pipe(Argument.variadic({ min: 1 })),
    ...repositorySkillFlags,
  },
  ({ query, projectDir, target }) =>
    listProjectSkills({ all: true, projectDir, query: query.join(" "), target }),
).pipe(CliCommand.withDescription("Search the approved skill catalog."));

const projectSkillsInfoCommand = CliCommand.make(
  "info",
  { skill: Argument.string("skill"), ...repositorySkillFlags },
  ({ skill, projectDir, target }) => showProjectSkill(skill, { projectDir, target }),
).pipe(CliCommand.withDescription("Show one skill's description and provenance."));

const projectSkillsStatusCommand = CliCommand.make(
  "status",
  repositorySkillFlags,
  ({ projectDir, target }) => statusProjectSkills({ projectDir, target }),
).pipe(CliCommand.withDescription("Compare tracked skills with their approved upstream copies."));

const projectSkillsUpdateCommand = CliCommand.make(
  "update",
  {
    skills: Argument.string("skills").pipe(Argument.variadic()),
    acceptLocal: Flag.boolean("accept-local").pipe(
      Flag.withDescription(
        "After an agent merge, keep local content and accept the latest upstream base.",
      ),
    ),
    dryRun: Flag.boolean("dry-run").pipe(Flag.withDescription("Preview without writing.")),
    ...repositorySkillFlags,
  },
  ({ skills, acceptLocal, dryRun, projectDir, target }) =>
    updateProjectSkills(skills, { acceptLocal, dryRun, projectDir, target }),
).pipe(
  CliCommand.withDescription(
    "Fast-forward unmodified tracked skills; preserve locally edited copies for an agent merge.",
  ),
);

const projectSkillsDiffCommand = CliCommand.make(
  "diff",
  { skill: Argument.string("skill"), ...repositorySkillFlags },
  ({ skill, projectDir, target }) => diffProjectSkill(skill, { projectDir, target }),
).pipe(CliCommand.withDescription("Diff a tracked skill against its approved upstream copy."));

const projectSkillsDetachCommand = CliCommand.make(
  "detach",
  {
    skills: Argument.string("skills").pipe(Argument.variadic({ min: 1 })),
    dryRun: Flag.boolean("dry-run").pipe(Flag.withDescription("Preview without writing.")),
    ...repositorySkillFlags,
  },
  ({ skills, dryRun, projectDir, target }) =>
    detachProjectSkills(skills, { dryRun, projectDir, target }),
).pipe(CliCommand.withDescription("Remove upstream receipts while leaving skill content intact."));

const projectSkillsCommand = CliCommand.make("skills").pipe(
  CliCommand.withDescription("Copy and optionally refresh repo-owned agent skills."),
  CliCommand.withSubcommands([
    projectSkillsAddCommand,
    projectSkillsListCommand,
    projectSkillsSearchCommand,
    projectSkillsInfoCommand,
    projectSkillsStatusCommand,
    projectSkillsUpdateCommand,
    projectSkillsDiffCommand,
    projectSkillsDetachCommand,
  ] as const),
);

const gitignoreCommand = CliCommand.make(
  "gitignore",
  {
    dryRun: Flag.boolean("dry-run"),
    projectDir: Flag.string("project-dir").pipe(Flag.withDefault(".")),
  },
  ({ dryRun, projectDir }) => patchProjectGitignore({ dryRun, projectDir }),
).pipe(
  CliCommand.withDescription("Idempotently add .repos/ and .dev-kit/ to the project .gitignore."),
);

const tsgoPatchCommand = CliCommand.make(
  "patch",
  {
    dryRun: Flag.boolean("dry-run"),
    force: Flag.boolean("force"),
    projectDir: Flag.string("project-dir").pipe(Flag.withDefault(".")),
    typescriptPackage: Flag.string("typescript-package").pipe(Flag.withDefault("typescript")),
  },
  ({ dryRun, force, projectDir, typescriptPackage }) =>
    patchEffectTsgo({ dryRun, force, projectDir, typescriptPackage }),
).pipe(
  CliCommand.withDescription(
    "Patch the project-local native TypeScript compiler with the pinned Effect language service.",
  ),
);

const tsgoCommand = CliCommand.make("tsgo").pipe(
  CliCommand.withDescription("Manage the pinned Effect TypeScript-Go integration."),
  CliCommand.withSubcommands([tsgoPatchCommand] as const),
);

const effectSyncCommand = CliCommand.make(
  "sync",
  {
    dryRun: Flag.boolean("dry-run"),
    packageName: Flag.string("package").pipe(Flag.withDefault("effect")),
    path: Flag.string("path").pipe(Flag.withDefault(".repos/effect")),
    projectDir: Flag.string("project-dir").pipe(Flag.withDefault(".")),
    repository: Flag.string("repository").pipe(
      Flag.withDefault("https://github.com/Effect-TS/effect.git"),
    ),
  },
  ({ dryRun, packageName, path, projectDir, repository }) =>
    syncEffectSource({
      dryRun,
      packageName,
      path,
      projectDir,
      repository,
    }),
).pipe(
  CliCommand.withDescription(
    "Sync a detached Effect source checkout to the installed package version.",
  ),
);

const effectCommand = CliCommand.make("effect").pipe(
  CliCommand.withDescription("Manage the version-matched Effect source checkout."),
  CliCommand.withSubcommands([effectSyncCommand] as const),
);

const catalogFilesFlags = {
  lockfile: Flag.string("lockfile").pipe(
    Flag.withDefault("skill-sources.lock.json"),
    Flag.withDescription("Approved catalog snapshot path."),
  ),
  repoDir: Flag.string("repo-dir").pipe(
    Flag.withDefault("."),
    Flag.withDescription("Catalog repository directory."),
  ),
  sources: Flag.string("sources").pipe(
    Flag.withDefault("skill-sources.jsonc"),
    Flag.withDescription("Authored source manifest path."),
  ),
};

const catalogAddCommand = CliCommand.make(
  "add",
  {
    repository: Argument.string("repository"),
    all: Flag.boolean("all").pipe(
      Flag.withDescription("Approve every skill discovered in this snapshot."),
    ),
    dryRun: Flag.boolean("dry-run").pipe(Flag.withDescription("Inspect without writing.")),
    id: Flag.string("id").pipe(
      Flag.withDefault(""),
      Flag.withDescription("Override the inferred source id."),
    ),
    license: Flag.string("license").pipe(
      Flag.withDefault(""),
      Flag.withDescription("Repository-relative license path."),
    ),
    ref: Flag.string("ref").pipe(
      Flag.withDefault(""),
      Flag.withDescription("Branch, tag, or commit to track."),
    ),
    skill: Flag.string("skill").pipe(
      Flag.atLeast(0),
      Flag.withDescription("Approve one skill; repeat for several."),
    ),
    skillsPath: Flag.string("skills-path").pipe(
      Flag.withDefault(""),
      Flag.withDescription("Repository-relative directory containing skills."),
    ),
    stripFrontmatter: Flag.string("strip-frontmatter").pipe(
      Flag.atLeast(0),
      Flag.withDescription("Remove an upstream frontmatter key; repeat for several."),
    ),
    ...catalogFilesFlags,
  },
  ({
    repository,
    all,
    dryRun,
    id,
    license,
    ref,
    skill,
    skillsPath,
    stripFrontmatter,
    lockfile,
    repoDir,
    sources,
  }) => {
    const options = {
      repository,
      all,
      dryRun,
      skills: skill,
      stripFrontmatter,
      lockfilePath: lockfile,
      repoDir,
      sourcesPath: sources,
    };

    if (id) Object.assign(options, { id });
    if (license) Object.assign(options, { licensePath: license });
    if (ref) Object.assign(options, { ref });
    if (skillsPath) Object.assign(options, { skillsPath });

    return addCatalogSource(options);
  },
).pipe(CliCommand.withDescription("Inspect a repository and approve selected skills."));

const catalogListCommand = CliCommand.make(
  "list",
  catalogFilesFlags,
  ({ lockfile, repoDir, sources }) =>
    listCatalogSources({ lockfilePath: lockfile, repoDir, sourcesPath: sources }),
).pipe(CliCommand.withDescription("List approved upstream repositories."));

const catalogInfoCommand = CliCommand.make(
  "info",
  { source: Argument.string("source"), ...catalogFilesFlags },
  ({ source, lockfile, repoDir, sources }) =>
    showCatalogSource(source, { lockfilePath: lockfile, repoDir, sourcesPath: sources }),
).pipe(CliCommand.withDescription("Show an approved source and its skills."));

const catalogRemoveCommand = CliCommand.make(
  "remove",
  {
    entry: Argument.string("source-or-skill"),
    dryRun: Flag.boolean("dry-run").pipe(Flag.withDescription("Preview without writing.")),
    yes: Flag.boolean("yes").pipe(Flag.withDescription("Confirm catalog revocation.")),
    ...catalogFilesFlags,
  },
  ({ entry, dryRun, yes, lockfile, repoDir, sources }) =>
    removeCatalogEntry(entry, {
      dryRun,
      yes,
      lockfilePath: lockfile,
      repoDir,
      sourcesPath: sources,
    }),
).pipe(CliCommand.withDescription("Revoke an approved source or individual skill."));

const catalogRefreshCommand = CliCommand.make(
  "refresh",
  {
    dryRun: Flag.boolean("dry-run").pipe(Flag.withDescription("Preview without writing.")),
    locked: Flag.boolean("locked").pipe(Flag.withHidden),
    ...catalogFilesFlags,
  },
  ({ dryRun, locked, lockfile, repoDir, sources }) =>
    refreshSkillCatalog({ dryRun, locked, lockfilePath: lockfile, repoDir, sourcesPath: sources }),
).pipe(
  CliCommand.withDescription("Approve the current upstream refs as an exact catalog snapshot."),
);

const catalogVerifyCommand = CliCommand.make(
  "verify",
  catalogFilesFlags,
  ({ lockfile, repoDir, sources }) =>
    refreshSkillCatalog({ locked: true, lockfilePath: lockfile, repoDir, sourcesPath: sources }),
).pipe(CliCommand.withDescription("Verify the committed catalog without advancing refs."));

const cachePruneCommand = CliCommand.make(
  "prune",
  {
    all: Flag.boolean("all").pipe(
      Flag.withDescription("Remove the entire cache instead of only stale content."),
    ),
    maxAgeDays: Flag.integer("max-age-days").pipe(
      Flag.withDefault(CACHE_PRUNE_AGE_DAYS),
      Flag.withDescription("Evict content unused for this many days."),
    ),
  },
  ({ all, maxAgeDays }) => runCachePrune({ all, maxAgeDays }),
).pipe(CliCommand.withDescription("Evict stale content from the machine-global source cache."));

const cacheCommand = CliCommand.make("cache").pipe(
  CliCommand.withDescription("Manage the machine-global source cache."),
  CliCommand.withSubcommands([cachePruneCommand] as const),
);

const catalogCommand = CliCommand.make("catalog").pipe(
  CliCommand.withDescription("Maintain the approved upstream catalog."),
  CliCommand.withSubcommands([
    catalogAddCommand,
    catalogRemoveCommand,
    catalogListCommand,
    catalogInfoCommand,
    catalogRefreshCommand,
    catalogVerifyCommand,
  ] as const),
);

const command = CliCommand.make("dev-kit", {}, () => showProjectSkillsDashboard()).pipe(
  CliCommand.withDescription("Agent-led repository setup and an approved skill catalog."),
  CliCommand.withSubcommands([
    {
      group: "Repository",
      commands: [setupCommand, projectSkillsCommand, ejectCommand],
    },
    {
      group: "Toolbox",
      commands: [gitignoreCommand, effectCommand, tsgoCommand, catalogCommand, cacheCommand],
    },
  ] as const),
);

const program = CliCommand.run(command, { version: DEV_KIT_VERSION }).pipe(
  Effect.catchFilter(
    (error) =>
      CliError.isCliError(error) && error._tag === "ShowHelp"
        ? Result.fail(error)
        : Result.succeed(error),
    (error) =>
      printError(error instanceof Error ? error.message : String(error)).pipe(
        Effect.andThen(Effect.fail(error)),
      ),
  ),
  Effect.scoped,
  Effect.provide(BunServices.layer),
);

BunRuntime.runMain(program, { disableErrorReporting: true });
