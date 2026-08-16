import { Effect, FileSystem, Path, Schema, SchemaGetter, Stream } from "effect";
import { ChildProcess } from "effect/unstable/process";

import {
  loadSkillCatalog,
  resolveSkillSources,
  type CatalogSkill,
  type ResolvedSkillSource,
  type SkillCatalog,
} from "./catalog.ts";
import { printDetail, printLine, printStatus, withSpinner } from "./cli-ui.ts";
import { observeSymbolicLink } from "./node-symbolic-link.ts";
import {
  DigestSchema,
  observeDirectoryWithoutEntry,
  observePath,
  type Digest,
} from "./path-digest.ts";
import { isSkillName, SKILL_SELECTOR_PATTERN } from "./skill-selector.ts";
import { DEV_KIT_VERSION } from "./tool-metadata.ts";

export const SKILL_ORIGIN_FILE = ".dev-kit-origin.json";
export const DEFAULT_SKILLS_TARGET = ".agents/skills";

const SkillOriginSourceSchema = Schema.Union([
  Schema.Struct({
    type: Schema.Literal("bundled"),
    version: Schema.String,
  }),
  Schema.Struct({
    type: Schema.Literal("git"),
    source: Schema.String,
    repository: Schema.String,
    resolved: Schema.String,
  }),
  Schema.Struct({
    type: Schema.Literal("package"),
    package: Schema.String,
    version: Schema.String,
    skill: Schema.String,
    digest: DigestSchema,
  }),
]);

export const SkillOriginSchema = Schema.Struct({
  version: Schema.Literal(1),
  selector: Schema.String.check(Schema.isPattern(SKILL_SELECTOR_PATTERN)),
  name: Schema.String.check(Schema.isPattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)),
  baseDigest: DigestSchema,
  source: SkillOriginSourceSchema,
});
export type SkillOrigin = typeof SkillOriginSchema.Type;

const decodeSkillOrigin = Schema.decodeUnknownEffect(Schema.fromJsonString(SkillOriginSchema));
const encodeSkillOrigin = Schema.encodeSync(
  Schema.String.pipe(
    Schema.decodeTo(Schema.toCodecJson(SkillOriginSchema), {
      decode: SchemaGetter.parseJson(),
      encode: SchemaGetter.stringifyJson({ space: 2 }),
    }),
  ),
);

export class ProjectSkillError extends Schema.TaggedError<ProjectSkillError>()(
  "ProjectSkillError",
  {
    message: Schema.String,
  },
) {}

export type ProjectSkillOptions = {
  readonly projectDir?: string;
  readonly target?: string;
  readonly dryRun?: boolean;
};

export type UpdateProjectSkillOptions = ProjectSkillOptions & {
  readonly acceptLocal?: boolean;
};

type InstalledSkill = {
  readonly name: string;
  readonly path: string;
  readonly origin?: SkillOrigin;
  readonly originError?: string;
};

const packageRoot = Effect.fn("projectSkillsPackageRoot")(function* () {
  const path = yield* Path.Path;

  return path.resolve(path.dirname(yield* path.fromFileUrl(new URL(import.meta.url))), "..");
});

const resolveProjectPaths = Effect.fn("resolveProjectSkillPaths")(function* (
  options: ProjectSkillOptions,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const projectDir = yield* fs.realPath(path.resolve(options.projectDir ?? ".")).pipe(
    Effect.mapError(() =>
      ProjectSkillError.make({
        message: `project directory not found: ${options.projectDir ?? "."}`,
      }),
    ),
  );
  const requestedTarget = options.target ?? DEFAULT_SKILLS_TARGET;

  if (requestedTarget.length === 0 || path.isAbsolute(requestedTarget)) {
    return yield* ProjectSkillError.make({
      message: "--target must be a non-empty project-relative directory",
    });
  }
  const target = path.resolve(projectDir, requestedTarget);
  const relative = path.relative(projectDir, target);

  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    return yield* ProjectSkillError.make({ message: "--target must resolve inside the project" });
  }
  let ancestor = projectDir;

  for (const segment of relative.split(path.sep)) {
    ancestor = path.join(ancestor, segment);
    if ((yield* observeSymbolicLink(ancestor)).kind === "symlink") {
      return yield* ProjectSkillError.make({
        message: `skills target passes through a symlink: ${path.relative(projectDir, ancestor)}`,
      });
    }
  }

  return { projectDir, target, targetRelative: relative };
});

const readOrigin = Effect.fn("readProjectSkillOrigin")(function* (skillPath: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const originPath = path.join(skillPath, SKILL_ORIGIN_FILE);

  if (!(yield* fs.exists(originPath))) return undefined;

  return yield* fs.readFileString(originPath).pipe(
    Effect.flatMap(decodeSkillOrigin),
    Effect.mapError((error) =>
      ProjectSkillError.make({ message: `invalid ${originPath}: ${error.message}` }),
    ),
  );
});

const inspectInstalledSkills = Effect.fn("inspectInstalledProjectSkills")(function* (
  target: string,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const installed: Array<InstalledSkill> = [];

  if (!(yield* fs.exists(target))) return installed;
  const targetInfo = yield* fs.stat(target);

  if (targetInfo.type !== "Directory") {
    return yield* ProjectSkillError.make({
      message: `skills target is not a directory: ${target}`,
    });
  }
  for (const name of (yield* fs.readDirectory(target)).filter(isSkillName).sort()) {
    const skillPath = path.join(target, name);
    const observation = yield* observePath(skillPath);

    if (observation.kind !== "directory" || !(yield* fs.exists(path.join(skillPath, "SKILL.md")))) {
      continue;
    }
    const originResult = yield* Effect.result(readOrigin(skillPath));

    if (originResult._tag === "Success") {
      const skill: InstalledSkill = { name, path: skillPath };

      if (originResult.success !== undefined)
        Object.assign(skill, { origin: originResult.success });
      installed.push(skill);
    } else {
      installed.push({ name, path: skillPath, originError: originResult.failure.message });
    }
  }

  return installed;
});

const displayValue = (value: string): string =>
  [...value]
    .map((character) => {
      const code = character.charCodeAt(0);

      return code <= 31 || (code >= 127 && code <= 159) ? " " : character;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();

const summary = (description: string, fallback: string): string => {
  const text = displayValue(description || fallback);
  const firstSentence = text.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim() ?? text;

  return firstSentence.length > 96 ? `${firstSentence.slice(0, 93).trimEnd()}…` : firstSentence;
};

const selectSkills = (
  catalog: SkillCatalog,
  names: ReadonlyArray<string>,
): ReadonlyArray<CatalogSkill> => {
  const selectors = new Set<string>();

  for (const name of names) {
    const family = catalog.families[name];

    if (family !== undefined) {
      for (const selector of family) selectors.add(selector);
    } else {
      selectors.add(name);
    }
  }
  const catalogBySelector = new Map(catalog.skills.map((skill) => [skill.selector, skill]));
  const unknown = [...selectors].filter((selector) => !catalogBySelector.has(selector));

  if (unknown.length > 0) {
    throw new Error(
      `unknown skill${unknown.length === 1 ? "" : "s"}: ${unknown.join(", ")}. Try \`dev-kit skills search ${unknown[0]}\`.`,
    );
  }

  return [...selectors].map((selector) => catalogBySelector.get(selector)!);
};

const sourceOrigin = (
  skill: CatalogSkill,
  source: ResolvedSkillSource,
  baseDigest: Digest,
): SkillOrigin => {
  const common = {
    version: 1 as const,
    selector: skill.selector,
    name: skill.name,
    baseDigest,
  };

  if (source.catalog === undefined) {
    return { ...common, source: { type: "bundled", version: DEV_KIT_VERSION } };
  }
  if ("source" in source.catalog) {
    return {
      ...common,
      source: {
        type: "git",
        source: source.catalog.source,
        repository: source.catalog.repository,
        resolved: source.catalog.resolved,
      },
    };
  }

  return { ...common, source: { type: "package", ...source.catalog } };
};

export const renderSkillOrigin = (origin: SkillOrigin): string => `${encodeSkillOrigin(origin)}\n`;

const resolveSources = Effect.fn("resolveProjectSkillSources")(function* (
  projectDir: string,
  skills: ReadonlyArray<CatalogSkill>,
  catalog: SkillCatalog,
) {
  const selectors = skills.map((skill) => skill.selector);

  return yield* withSpinner(
    "Resolving skills",
    resolveSkillSources(yield* packageRoot(), projectDir, catalog, selectors, false),
  );
});

export const addProjectSkills = Effect.fn("addProjectSkills")(function* (
  names: ReadonlyArray<string>,
  options: ProjectSkillOptions = {},
) {
  if (names.length === 0) {
    return yield* ProjectSkillError.make({ message: "choose at least one skill to add" });
  }
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const paths = yield* resolveProjectPaths(options);
  const catalog = yield* loadSkillCatalog(yield* packageRoot(), paths.projectDir);
  const skills = yield* Effect.try({
    try: () => selectSkills(catalog, names),
    catch: (error) =>
      ProjectSkillError.make({ message: error instanceof Error ? error.message : String(error) }),
  });
  const duplicateName = skills.find(
    (skill, index) => skills.findIndex((candidate) => candidate.name === skill.name) !== index,
  );

  if (duplicateName !== undefined) {
    return yield* ProjectSkillError.make({
      message: `selected skills collide at ${duplicateName.name}`,
    });
  }
  for (const skill of skills) {
    const destination = path.join(paths.target, skill.name);

    if ((yield* observePath(destination)).kind !== "missing") {
      return yield* ProjectSkillError.make({
        message: `skill destination already exists: ${path.relative(paths.projectDir, destination)}`,
      });
    }
  }
  const sources = yield* resolveSources(paths.projectDir, skills, catalog);

  for (const skill of skills) {
    const source = sources.get(skill.selector);

    if (source === undefined) {
      return yield* ProjectSkillError.make({
        message: `skill source unavailable: ${skill.selector}`,
      });
    }
    const observation = yield* observePath(source.path);

    if (observation.kind !== "directory") {
      return yield* ProjectSkillError.make({
        message: `skill source is not a directory: ${skill.selector}`,
      });
    }
    const relativeDestination = path.join(paths.targetRelative, skill.name);

    if (options.dryRun) {
      yield* printStatus("plan", `Add ${skill.selector}`, relativeDestination);
      continue;
    }
    const temp = yield* fs.makeTempDirectoryScoped({
      directory: paths.projectDir,
      prefix: ".dev-kit-skill-add-",
    });
    const staged = path.join(temp, skill.name);

    yield* fs.copy(source.path, staged, { overwrite: true });
    yield* fs.writeFileString(
      path.join(staged, SKILL_ORIGIN_FILE),
      renderSkillOrigin(sourceOrigin(skill, source, observation.digest)),
    );
    yield* fs.makeDirectory(paths.target, { recursive: true });
    yield* fs.rename(staged, path.join(paths.target, skill.name));
    yield* printStatus("success", `Added ${skill.selector}`, relativeDestination);
  }
});

export const setupProject = Effect.fn("setupProject")(function* (
  options: ProjectSkillOptions = {},
) {
  const paths = yield* resolveProjectPaths(options);
  const installed = yield* inspectInstalledSkills(paths.target);
  const existing = installed.find((skill) => skill.name === "dev-kit");

  if (existing?.origin?.selector === "dev-kit") {
    yield* printStatus("success", "Dev Kit setup skill already present", paths.targetRelative);

    return;
  }
  yield* addProjectSkills(["dev-kit"], options);

  if (!options.dryRun) {
    yield* printDetail("Ask your agent: Use $dev-kit to set up this repository.");
  }
});

export const listProjectSkills = Effect.fn("listProjectSkills")(function* (
  options: ProjectSkillOptions & { readonly all?: boolean; readonly query?: string } = {},
) {
  const paths = yield* resolveProjectPaths(options);
  const catalog = yield* loadSkillCatalog(yield* packageRoot(), paths.projectDir);
  const installed = yield* inspectInstalledSkills(paths.target);
  const installedBySelector = new Map(
    installed.flatMap((skill) => (skill.origin ? [[skill.origin.selector, skill] as const] : [])),
  );
  const query = options.query?.toLowerCase();
  const visible = catalog.skills.filter(
    (skill) =>
      (options.all || installedBySelector.has(skill.selector)) &&
      (!query ||
        `${skill.selector} ${skill.description} ${skill.source}`.toLowerCase().includes(query)),
  );

  for (const skill of visible) {
    const marker = installedBySelector.has(skill.selector) ? "✓" : " ";
    const provenance = skill.package
      ? ` [installed ${displayValue(skill.package.version)}]`
      : skill.bundled
        ? ""
        : ` [${skill.source}]`;

    yield* printLine(
      `${marker} ${skill.selector}${provenance}  ${summary(skill.description, skill.source)}`,
    );
  }
  const local = installed.filter(
    (skill) => skill.origin === undefined && (!query || skill.name.toLowerCase().includes(query)),
  );

  for (const skill of local) {
    yield* printLine(`• ${skill.name} [local]`);
    if (skill.originError) yield* printDetail(skill.originError);
  }
  if (visible.length === 0 && local.length === 0) {
    yield* printStatus("info", query ? "No matching skills" : "No tracked skills");
    if (!query && !options.all) yield* printDetail("Browse with: dev-kit skills list --all");

    return;
  }
  yield* printLine();
  yield* printLine(`${installed.length} installed · ${catalog.skills.length} available`);
});

export const showProjectSkill = Effect.fn("showProjectSkill")(function* (
  selector: string,
  options: ProjectSkillOptions = {},
) {
  const paths = yield* resolveProjectPaths(options);
  const catalog = yield* loadSkillCatalog(yield* packageRoot(), paths.projectDir);
  const skill = catalog.skills.find((candidate) => candidate.selector === selector);

  if (skill === undefined) {
    return yield* ProjectSkillError.make({ message: `unknown skill: ${selector}` });
  }
  yield* printLine(skill.selector);
  if (skill.description) yield* printLine(displayValue(skill.description));
  yield* printLine(`Source: ${skill.bundled ? "Dev Kit" : skill.source}`);
  if (skill.package) yield* printLine(`Package: ${skill.package.name}@${skill.package.version}`);
});

const resolveTrackedSkills = Effect.fn("resolveTrackedProjectSkills")(function* (
  names: ReadonlyArray<string>,
  options: ProjectSkillOptions,
) {
  const paths = yield* resolveProjectPaths(options);
  const installed = yield* inspectInstalledSkills(paths.target);
  const tracked = installed.filter(
    (skill): skill is InstalledSkill & { readonly origin: SkillOrigin } =>
      skill.origin !== undefined &&
      (names.length === 0 || names.includes(skill.name) || names.includes(skill.origin.selector)),
  );
  const unknown = names.filter(
    (name) => !tracked.some((skill) => skill.name === name || skill.origin.selector === name),
  );

  if (unknown.length > 0) {
    return yield* ProjectSkillError.make({
      message: `tracked skill not found: ${unknown.join(", ")}`,
    });
  }

  return { paths, tracked };
});

const inspectTrackedSkill = Effect.fn("inspectTrackedProjectSkill")(function* (
  skill: InstalledSkill & { readonly origin: SkillOrigin },
  latest: ResolvedSkillSource,
) {
  const current = yield* observeDirectoryWithoutEntry(skill.path, SKILL_ORIGIN_FILE);
  const upstream = yield* observePath(latest.path);

  if (current.kind !== "directory" || upstream.kind !== "directory") {
    return yield* ProjectSkillError.make({ message: `could not inspect skill: ${skill.name}` });
  }

  return {
    currentDigest: current.digest,
    upstreamDigest: upstream.digest,
    locallyModified: current.digest !== skill.origin.baseDigest,
    upstreamChanged: upstream.digest !== skill.origin.baseDigest,
  };
});

export const statusProjectSkills = Effect.fn("statusProjectSkills")(function* (
  options: ProjectSkillOptions = {},
) {
  const { paths, tracked } = yield* resolveTrackedSkills([], options);

  if (tracked.length === 0) {
    yield* printStatus("info", "No tracked skills", paths.targetRelative);

    return;
  }
  const catalog = yield* loadSkillCatalog(yield* packageRoot(), paths.projectDir);
  const catalogBySelector = new Map(catalog.skills.map((skill) => [skill.selector, skill]));
  const available = tracked.flatMap((installed) => {
    const skill = catalogBySelector.get(installed.origin.selector);

    return skill === undefined ? [] : [{ installed, skill }];
  });
  const sources = yield* resolveSources(
    paths.projectDir,
    available.map(({ skill }) => skill),
    catalog,
  );

  for (const trackedSkill of tracked) {
    const catalogSkill = catalogBySelector.get(trackedSkill.origin.selector);

    if (catalogSkill === undefined) {
      yield* printStatus("error", trackedSkill.name, "upstream unavailable");
      continue;
    }
    const source = sources.get(catalogSkill.selector);

    if (source === undefined) {
      yield* printStatus("error", trackedSkill.name, "source unavailable");
      continue;
    }
    const status = yield* inspectTrackedSkill(trackedSkill, source);
    const detail = status.locallyModified
      ? status.upstreamChanged
        ? "local and upstream changes"
        : "locally modified"
      : status.upstreamChanged
        ? "update available"
        : "current";

    yield* printStatus(detail === "current" ? "success" : "info", trackedSkill.name, detail);
  }
});

export const updateProjectSkills = Effect.fn("updateProjectSkills")(function* (
  names: ReadonlyArray<string>,
  options: UpdateProjectSkillOptions = {},
) {
  if (options.acceptLocal && names.length === 0) {
    return yield* ProjectSkillError.make({
      message: "--accept-local requires explicit skill names",
    });
  }
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const { paths, tracked } = yield* resolveTrackedSkills(names, options);

  if (tracked.length === 0) {
    yield* printStatus("info", "No tracked skills", paths.targetRelative);

    return;
  }
  const catalog = yield* loadSkillCatalog(yield* packageRoot(), paths.projectDir);
  const catalogBySelector = new Map(catalog.skills.map((skill) => [skill.selector, skill]));
  const available: Array<{
    readonly installed: (typeof tracked)[number];
    readonly skill: CatalogSkill;
  }> = [];

  for (const installed of tracked) {
    const skill = catalogBySelector.get(installed.origin.selector);

    if (skill === undefined) {
      return yield* ProjectSkillError.make({
        message: `upstream unavailable: ${installed.origin.selector}`,
      });
    }
    available.push({ installed, skill });
  }
  const sources = yield* resolveSources(
    paths.projectDir,
    available.map(({ skill }) => skill),
    catalog,
  );
  let conflicts = 0;

  for (const { installed, skill } of available) {
    const source = sources.get(skill.selector);

    if (source === undefined) {
      return yield* ProjectSkillError.make({ message: `source unavailable: ${skill.selector}` });
    }
    const status = yield* inspectTrackedSkill(installed, source);

    if (!status.upstreamChanged) {
      yield* printStatus(
        "success",
        installed.name,
        status.locallyModified ? "locally modified" : "current",
      );
      continue;
    }
    if (status.locallyModified) {
      if (options.acceptLocal) {
        if (options.dryRun) {
          yield* printStatus("plan", `Keep local ${installed.name}`, "accept latest upstream base");
        } else {
          yield* fs.writeFileString(
            path.join(installed.path, SKILL_ORIGIN_FILE),
            renderSkillOrigin(sourceOrigin(skill, source, status.upstreamDigest)),
          );
          yield* printStatus(
            "success",
            `Kept local ${installed.name}`,
            "accepted latest upstream base",
          );
        }
        continue;
      }
      conflicts += 1;
      yield* printStatus("error", installed.name, "local and upstream changes");
      yield* printDetail(`Inspect with: dev-kit skills diff ${installed.name}`);
      continue;
    }
    if (options.dryRun) {
      yield* printStatus("plan", `Update ${installed.name}`);
      continue;
    }
    const temp = yield* fs.makeTempDirectoryScoped({
      directory: paths.projectDir,
      prefix: ".dev-kit-skill-update-",
    });
    const staged = path.join(temp, installed.name);
    const backup = path.join(temp, `${installed.name}.previous`);

    yield* fs.copy(source.path, staged, { overwrite: true });
    yield* fs.writeFileString(
      path.join(staged, SKILL_ORIGIN_FILE),
      renderSkillOrigin(sourceOrigin(skill, source, status.upstreamDigest)),
    );
    yield* fs.rename(installed.path, backup);
    yield* fs
      .rename(staged, installed.path)
      .pipe(
        Effect.catch((error) =>
          fs.rename(backup, installed.path).pipe(Effect.andThen(Effect.fail(error))),
        ),
      );
    yield* printStatus("success", `Updated ${installed.name}`);
  }
  if (conflicts > 0) {
    return yield* ProjectSkillError.make({
      message: `${conflicts} modified skill${conflicts === 1 ? " requires" : "s require"} an agent-guided merge`,
    });
  }
});

export const diffProjectSkill = Effect.fn("diffProjectSkill")(function* (
  name: string,
  options: ProjectSkillOptions = {},
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const { paths, tracked } = yield* resolveTrackedSkills([name], options);
  const installed = tracked[0];

  if (installed === undefined) {
    return yield* ProjectSkillError.make({ message: `tracked skill not found: ${name}` });
  }
  const catalog = yield* loadSkillCatalog(yield* packageRoot(), paths.projectDir);
  const skill = catalog.skills.find(
    (candidate) => candidate.selector === installed.origin.selector,
  );

  if (skill === undefined) {
    return yield* ProjectSkillError.make({
      message: `upstream unavailable: ${installed.origin.selector}`,
    });
  }
  const sources = yield* resolveSources(paths.projectDir, [skill], catalog);
  const source = sources.get(skill.selector);

  if (source === undefined) {
    return yield* ProjectSkillError.make({ message: `source unavailable: ${skill.selector}` });
  }
  const temp = yield* fs.makeTempDirectoryScoped({ prefix: "dev-kit-skill-diff-" });
  const current = path.join(temp, installed.name);

  yield* fs.copy(installed.path, current, { overwrite: true });
  yield* fs.remove(path.join(current, SKILL_ORIGIN_FILE), { force: true });
  const child = yield* ChildProcess.make(
    "git",
    ["diff", "--no-index", "--", current, source.path],
    {
      cwd: paths.projectDir,
      stderr: "pipe",
      stdout: "pipe",
    },
  );
  const [output, exitCode] = yield* Effect.all([
    Stream.mkString(Stream.decodeText(child.all)),
    child.exitCode,
  ]);

  if (exitCode > 1) {
    return yield* ProjectSkillError.make({ message: `git diff failed: ${output.trim()}` });
  }
  yield* printLine(output.trimEnd());
});

export const detachProjectSkills = Effect.fn("detachProjectSkills")(function* (
  names: ReadonlyArray<string>,
  options: ProjectSkillOptions = {},
) {
  if (names.length === 0) {
    return yield* ProjectSkillError.make({ message: "choose at least one skill to detach" });
  }
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const { tracked } = yield* resolveTrackedSkills(names, options);

  for (const skill of tracked) {
    const originPath = path.join(skill.path, SKILL_ORIGIN_FILE);

    if (options.dryRun) yield* printStatus("plan", `Detach ${skill.name}`);
    else {
      yield* fs.remove(originPath);
      yield* printStatus("success", `Detached ${skill.name}`);
    }
  }
  yield* printDetail("Detached skills remain in the repository as ordinary local skills.");
});

export const showProjectSkillsDashboard = Effect.fn("showProjectSkillsDashboard")(function* () {
  yield* printLine("Dev Kit copies agent guidance into a repository, then gets out of the way.");
  yield* printLine();
  yield* printLine("Start     dev-kit setup");
  yield* printLine("Browse    dev-kit skills list --all");
  yield* printLine("Add       dev-kit skills add <skill>");
  yield* printLine("Update    dev-kit skills update");
  yield* printLine("Migrate   dev-kit eject --dry-run");
});
