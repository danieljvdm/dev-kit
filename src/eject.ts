import { Effect, FileSystem, Path, Schema, Stream } from "effect";
import { ChildProcess } from "effect/unstable/process";
import {
  applyEdits,
  modify,
  parse as parseJsonc,
  type FormattingOptions,
  type ParseError,
} from "jsonc-parser";

import { printDetail, printStatus } from "./cli-ui.ts";
import {
  LegacyDevKitLockSchema,
  LegacyDevKitManifestSchema,
  legacySetupFlags,
  type LegacyManagedSkillOutput,
} from "./legacy-project.ts";
import { observeSymbolicLink } from "./node-symbolic-link.ts";
import { observePath } from "./path-digest.ts";
import { readProjectPackage } from "./project-package.ts";
import {
  DEFAULT_SKILLS_TARGET,
  renderSkillOrigin,
  SKILL_ORIGIN_FILE,
  type SkillOrigin,
} from "./project-skills.ts";

export type EjectOptions = {
  readonly projectDir?: string;
  readonly manifestPath?: string;
  readonly lockfilePath?: string;
  readonly statePath?: string;
  readonly target?: string;
  readonly dryRun?: boolean;
};

type EjectAction =
  | {
      readonly type: "write";
      readonly path: string;
      readonly destination: string;
      readonly content: string;
      readonly label: string;
    }
  | {
      readonly type: "remove";
      readonly path: string;
      readonly destination: string;
      readonly label: string;
    }
  | {
      readonly type: "materialize-skill";
      readonly path: string;
      readonly destination: string;
      readonly source: string;
      readonly origin: SkillOrigin;
      readonly replaceSymlink: boolean;
      readonly label: string;
    };

type EjectPlan = {
  readonly projectDir: string;
  readonly actions: ReadonlyArray<EjectAction>;
  readonly conflicts: ReadonlyArray<string>;
};

type ManagedInstructionRelease =
  | { readonly type: "unchanged" }
  | { readonly type: "write"; readonly content: string }
  | { readonly type: "conflict"; readonly message: string };

type PackagePatch =
  | { readonly conflicts: ReadonlyArray<string> }
  | {
      readonly conflicts: ReadonlyArray<string>;
      readonly content: string;
      readonly path: "package.json";
      readonly destination: string;
    };

export class EjectError extends Schema.TaggedError<EjectError>()("EjectError", {
  message: Schema.String,
}) {}

const decodeManifest = Schema.decodeUnknownEffect(LegacyDevKitManifestSchema);
const decodeLock = Schema.decodeUnknownEffect(Schema.fromJsonString(LegacyDevKitLockSchema));

const FORMATTING_OPTIONS: FormattingOptions = { insertSpaces: true, tabSize: 2 };
const DEV_KIT_PACKAGE = "@danieljvdm/dev-kit";
const MANAGED_MARKER_START = "<!-- DEV KIT START -->";
const MANAGED_MARKER_END = "<!-- DEV KIT END -->";

const resolveInsideProject = (
  path: Path.Path,
  projectDir: string,
  candidate: string,
  label: string,
) => {
  if (candidate.length === 0 || path.isAbsolute(candidate)) {
    throw new Error(`${label} must be a non-empty project-relative path`);
  }
  const absolute = path.resolve(projectDir, candidate);
  const relative = path.relative(projectDir, absolute);

  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`${label} must resolve inside the project`);
  }

  return { absolute, relative };
};

const readRequiredFile = Effect.fn("readRequiredEjectFile")(function* (
  absolute: string,
  label: string,
) {
  const fs = yield* FileSystem.FileSystem;
  const observed = yield* observeSymbolicLink(absolute);

  if (observed.kind === "missing") {
    return yield* EjectError.make({ message: `${label} not found: ${absolute}` });
  }
  if (observed.kind === "symlink" || (yield* fs.stat(absolute)).type !== "File") {
    return yield* EjectError.make({ message: `${label} is not a regular file: ${absolute}` });
  }

  return yield* fs.readFileString(absolute);
});

const readLegacyManifest = Effect.fn("readLegacyEjectManifest")(function* (absolute: string) {
  const raw = yield* readRequiredFile(absolute, "legacy manifest");
  const errors: Array<ParseError> = [];
  const parsed = parseJsonc(raw, errors, { allowTrailingComma: true });

  if (errors.length > 0) {
    return yield* EjectError.make({ message: "legacy manifest contains invalid JSONC" });
  }

  return yield* decodeManifest(parsed).pipe(
    Effect.mapError((error) =>
      EjectError.make({ message: `invalid legacy manifest: ${error.message}` }),
    ),
  );
});

const findSymlinkAncestor = Effect.fn("findEjectSymlinkAncestor")(function* (
  projectDir: string,
  relative: string,
  includeLeaf: boolean,
) {
  const path = yield* Path.Path;
  const segments = relative.split(path.sep);
  const inspected = includeLeaf ? segments : segments.slice(0, -1);
  let ancestor = projectDir;

  for (const segment of inspected) {
    ancestor = path.join(ancestor, segment);
    if ((yield* observeSymbolicLink(ancestor)).kind === "symlink") {
      return path.relative(projectDir, ancestor);
    }
  }

  return undefined;
});

const removeObsoleteDevKitIntroduction = (content: string): string => {
  const lines = content.split(/\r?\n/);
  const retained: Array<string> = [];
  let skipParagraph = false;

  for (const line of lines) {
    if (line === "# Dev Kit") continue;
    if (
      line.startsWith("This project uses `@danieljvdm/dev-kit`") ||
      line.startsWith("For dev-kit operations, use the `dev-kit` skill")
    ) {
      skipParagraph = true;
      continue;
    }
    if (skipParagraph) {
      if (line.trim().length === 0) skipParagraph = false;
      continue;
    }
    retained.push(line);
  }

  return retained.join("\n").replace(/^\s+|\s+$/g, "");
};

const unwrapManagedAgentInstructions = (content: string): ManagedInstructionRelease => {
  const starts = content.split(MANAGED_MARKER_START).length - 1;
  const ends = content.split(MANAGED_MARKER_END).length - 1;

  if (starts === 0 && ends === 0) return { type: "unchanged" };
  if (starts !== 1 || ends !== 1) {
    return { type: "conflict", message: "AGENTS.md has duplicate or unmatched Dev Kit markers" };
  }
  const start = content.indexOf(MANAGED_MARKER_START);
  const end = content.indexOf(MANAGED_MARKER_END);

  if (end < start) {
    return { type: "conflict", message: "AGENTS.md has reversed Dev Kit markers" };
  }
  const before = content.slice(0, start).trimEnd();
  const managed = content.slice(start + MANAGED_MARKER_START.length, end);
  const after = content.slice(end + MANAGED_MARKER_END.length).trimStart();
  const retainedManaged = removeObsoleteDevKitIntroduction(managed);
  const sections = [before, retainedManaged, after].filter((section) => section.length > 0);

  return { type: "write", content: `${sections.join("\n\n").trimEnd()}\n` };
};

const patchPackageJson = Effect.fn("patchEjectedPackageJson")(function* (projectDir: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const packagePath = path.join(projectDir, "package.json");

  if (!(yield* fs.exists(packagePath))) {
    return { conflicts: [] } satisfies PackagePatch;
  }
  const manifest = yield* readProjectPackage(projectDir);
  const raw = yield* fs.readFileString(packagePath);
  let content = raw;
  const conflicts: Array<string> = [];

  for (const section of [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies",
  ] as const) {
    if (manifest[section]?.[DEV_KIT_PACKAGE] === undefined) continue;
    content = applyEdits(
      content,
      modify(content, [section, DEV_KIT_PACKAGE], undefined, {
        formattingOptions: FORMATTING_OPTIONS,
      }),
    );
  }
  const pureLegacyApply =
    /^(?:dev-kit|\.\/bin\/dev-kit\.mjs|bun \.\/node_modules\/@danieljvdm\/dev-kit\/bin\/dev-kit\.mjs) (?:apply|sync)(?: --locked)?$/;
  const legacyCommandReference =
    /(?:^|[ /])(?:@danieljvdm\/dev-kit(?:\/\S*)?|dev-kit(?:\.mjs)?)(?:\s|$)/;

  for (const [name, command] of Object.entries(manifest.scripts ?? {})) {
    if (!legacyCommandReference.test(command)) continue;
    if (pureLegacyApply.test(command)) {
      content = applyEdits(
        content,
        modify(content, ["scripts", name], undefined, { formattingOptions: FORMATTING_OPTIONS }),
      );
    } else {
      conflicts.push(`package.json script ${name} still depends on Dev Kit: ${command}`);
    }
  }

  if (content === raw) return { conflicts } satisfies PackagePatch;

  return {
    conflicts,
    content,
    path: "package.json",
    destination: packagePath,
  } satisfies PackagePatch;
});

const patchWorkflows = Effect.fn("patchEjectedWorkflows")(function* (projectDir: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const workflowsDir = path.join(projectDir, ".github", "workflows");
  const actions: Array<EjectAction> = [];
  const conflicts: Array<string> = [];

  if (!(yield* fs.exists(workflowsDir))) return { actions, conflicts };
  for (const name of yield* fs.readDirectory(workflowsDir)) {
    if (!/\.ya?ml$/.test(name)) continue;
    const destination = path.join(workflowsDir, name);
    const observed = yield* observeSymbolicLink(destination);

    if (observed.kind !== "not-symlink" || (yield* fs.stat(destination)).type !== "File") continue;
    const raw = yield* fs.readFileString(destination);
    const content = raw.replace(
      /^([ \t]*)- name: Verify locked Dev Kit setup\r?\n\1  run: [^\r\n]*dev-kit(?:\.mjs)? apply --locked\r?\n?/gm,
      "",
    );

    if (/dev-kit(?:\.mjs)? (?:apply|sync)/.test(content)) {
      conflicts.push(`${path.relative(projectDir, destination)} still invokes legacy Dev Kit`);
      continue;
    }
    if (content !== raw) {
      actions.push({
        type: "write",
        path: path.relative(projectDir, destination),
        destination,
        content,
        label: "Remove legacy CI verification",
      });
    }
  }

  return { actions, conflicts };
});

const findRuntimeImports = Effect.fn("findEjectRuntimeImports")(function* (projectDir: string) {
  const path = yield* Path.Path;
  const child = yield* ChildProcess.make(
    "git",
    ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
    {
      cwd: projectDir,
      stderr: "pipe",
      stdout: "pipe",
    },
  );
  const [output, exitCode] = yield* Effect.all([
    Stream.mkString(Stream.decodeText(child.all)),
    child.exitCode,
  ]);

  if (exitCode !== 0) {
    return yield* EjectError.make({ message: `git ls-files failed: ${output.trim()}` });
  }
  const fs = yield* FileSystem.FileSystem;
  const imports: Array<string> = [];
  const runtimeImport =
    /(?:from\s*|import\s*\(\s*|require\s*\(\s*|specifier\s*:\s*)["']@danieljvdm\/dev-kit(?:\/[^"']*)?["']/;

  for (const relative of output.split("\0").filter(Boolean)) {
    if (
      relative.startsWith(".agents/") ||
      relative.startsWith(".claude/") ||
      relative.startsWith(".opencode/") ||
      !/\.(?:[cm]?[jt]sx?|jsonc?|mjs|cjs)$/.test(relative)
    ) {
      continue;
    }
    const absolute = path.join(projectDir, relative);
    const observed = yield* observeSymbolicLink(absolute);

    if (observed.kind !== "not-symlink" || (yield* fs.stat(absolute)).type !== "File") continue;
    if (runtimeImport.test(yield* fs.readFileString(absolute))) imports.push(relative);
  }

  return imports;
});

const selectorFromLegacyOutput = (output: LegacyManagedSkillOutput): string => {
  const suffix = `@${output.target}`;
  const encoded = output.resourceId.startsWith("skill:")
    ? output.resourceId.slice("skill:".length)
    : output.skill;

  return encoded.endsWith(suffix) ? encoded.slice(0, -suffix.length) : output.skill;
};

const originFromLegacyOutput = (
  output: LegacyManagedSkillOutput,
  toolVersion: string,
  baseDigest: SkillOrigin["baseDigest"],
): SkillOrigin => {
  const common = {
    version: 1 as const,
    selector: selectorFromLegacyOutput(output),
    name: output.skill,
    baseDigest,
  };

  if (output.catalog === undefined) {
    return { ...common, source: { type: "bundled", version: toolVersion } };
  }
  if ("source" in output.catalog) {
    return { ...common, source: { type: "git", ...output.catalog } };
  }

  return { ...common, source: { type: "package", ...output.catalog } };
};

const planLegacySkills = Effect.fn("planEjectedLegacySkills")(function* (
  projectDir: string,
  target: string,
  toolVersion: string,
  outputs: ReadonlyArray<LegacyManagedSkillOutput>,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const actions: Array<EjectAction> = [];
  const conflicts: Array<string> = [];
  const bySkill = Map.groupBy(outputs, (output) => output.skill);
  const outputPaths = new Map<LegacyManagedSkillOutput, string>();

  for (const output of outputs) {
    const resolved = yield* Effect.try({
      try: () => resolveInsideProject(path, projectDir, output.path, "legacy skill path"),
      catch: (error) =>
        EjectError.make({ message: error instanceof Error ? error.message : String(error) }),
    });

    outputPaths.set(output, resolved.absolute);
  }

  for (const [skillName, skillOutputs] of bySkill) {
    const destination = path.join(target, skillName);
    const relativeDestination = path.relative(projectDir, destination);
    const destinationObserved = yield* observePath(destination);
    const matchingOutput = skillOutputs.find((output) => outputPaths.get(output) === destination);
    const candidate =
      matchingOutput ?? skillOutputs.find((output) => output.mode === "copy") ?? skillOutputs[0];

    if (candidate === undefined) continue;
    const candidatePath = outputPaths.get(candidate);

    if (candidatePath === undefined) {
      return yield* EjectError.make({
        message: `legacy skill path unavailable: ${candidate.path}`,
      });
    }
    const candidateObserved = yield* observePath(candidatePath);
    let source: string;

    if (candidateObserved.kind === "directory") source = candidatePath;
    else if (candidateObserved.kind === "symlink") {
      source = yield* fs
        .realPath(candidatePath)
        .pipe(
          Effect.mapError(() =>
            EjectError.make({ message: `legacy skill link is broken: ${candidate.path}` }),
          ),
        );
      if (candidate.catalog && "package" in candidate.catalog) {
        conflicts.push(
          `${candidate.path} is a package-backed symlink; install a copied target or merge it manually before ejecting`,
        );
        continue;
      }
    } else {
      conflicts.push(`legacy skill output is unavailable: ${candidate.path}`);
      continue;
    }
    const sourceObserved = yield* observePath(source);

    if (sourceObserved.kind !== "directory") {
      conflicts.push(`legacy skill source is not a directory: ${candidate.path}`);
      continue;
    }
    const baseDigest = candidate.mode === "copy" ? candidate.digest : sourceObserved.digest;
    const origin = originFromLegacyOutput(candidate, toolVersion, baseDigest);

    if (destinationObserved.kind === "directory") {
      if (matchingOutput === undefined) {
        conflicts.push(`repo-owned destination already exists: ${relativeDestination}`);
        continue;
      }
      const originPath = path.join(destination, SKILL_ORIGIN_FILE);
      const originObserved = yield* observePath(originPath);

      if (originObserved.kind === "missing") {
        actions.push({
          type: "write",
          path: path.relative(projectDir, originPath),
          destination: originPath,
          content: renderSkillOrigin(origin),
          label: `Release ${skillName} with an origin receipt`,
        });
      }
      continue;
    }
    if (destinationObserved.kind !== "missing" && destinationObserved.kind !== "symlink") {
      conflicts.push(`skill destination is not a directory: ${relativeDestination}`);
      continue;
    }
    if (destinationObserved.kind === "symlink" && matchingOutput === undefined) {
      conflicts.push(`repo-owned skill symlink already exists: ${relativeDestination}`);
      continue;
    }
    actions.push({
      type: "materialize-skill",
      path: relativeDestination,
      destination,
      source,
      origin,
      replaceSymlink: destinationObserved.kind === "symlink",
      label: `Materialize ${skillName}`,
    });
  }

  return { actions, conflicts };
});

export const planEject = Effect.fn("planEject")(function* (options: EjectOptions = {}) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const projectDir = yield* fs
    .realPath(path.resolve(options.projectDir ?? "."))
    .pipe(Effect.mapError(() => EjectError.make({ message: "project directory not found" })));
  const resolved = yield* Effect.try({
    try: () => ({
      manifest: resolveInsideProject(
        path,
        projectDir,
        options.manifestPath ?? "dev-kit.jsonc",
        "--manifest",
      ),
      lock: resolveInsideProject(
        path,
        projectDir,
        options.lockfilePath ?? "dev-kit.lock.json",
        "--lockfile",
      ),
      state: resolveInsideProject(
        path,
        projectDir,
        options.statePath ?? ".dev-kit/state.json",
        "--state",
      ),
      target: resolveInsideProject(
        path,
        projectDir,
        options.target ?? DEFAULT_SKILLS_TARGET,
        "--target",
      ),
    }),
    catch: (error) =>
      EjectError.make({ message: error instanceof Error ? error.message : String(error) }),
  });

  for (const file of [resolved.manifest, resolved.lock, resolved.state]) {
    const symlink = yield* findSymlinkAncestor(projectDir, file.relative, false);

    if (symlink !== undefined) {
      return yield* EjectError.make({
        message: `legacy metadata passes through a symlink: ${symlink}`,
      });
    }
  }
  const targetSymlink = yield* findSymlinkAncestor(projectDir, resolved.target.relative, true);

  if (targetSymlink !== undefined) {
    return yield* EjectError.make({
      message: `skills target passes through a symlink: ${targetSymlink}`,
    });
  }
  const setup = legacySetupFlags(yield* readLegacyManifest(resolved.manifest.absolute));
  const lock = yield* readRequiredFile(resolved.lock.absolute, "legacy lock").pipe(
    Effect.flatMap(decodeLock),
    Effect.mapError((error) =>
      EjectError.make({ message: `invalid legacy lock: ${error.message}` }),
    ),
  );
  const actions: Array<EjectAction> = [];
  const conflicts: Array<string> = [];

  if (setup.effectSource) {
    conflicts.push(
      "setup.effectSource is enabled; materialize its ongoing behavior before ejecting",
    );
  }
  if (setup.effectTsgo) {
    conflicts.push(
      "setup.effectTsgo is enabled; materialize its install-time patch before ejecting",
    );
  }
  if (setup.vitePlusHooks) {
    conflicts.push("setup.vitePlus.hooks is enabled; materialize Git hook setup before ejecting");
  }
  for (const importPath of yield* findRuntimeImports(projectDir)) {
    conflicts.push(`${importPath} imports Dev Kit runtime configuration`);
  }
  const packagePatch = yield* patchPackageJson(projectDir);

  conflicts.push(...packagePatch.conflicts);
  if (
    packagePatch.content !== undefined &&
    packagePatch.path !== undefined &&
    packagePatch.destination !== undefined
  ) {
    actions.push({
      type: "write",
      path: packagePatch.path,
      destination: packagePatch.destination,
      content: packagePatch.content,
      label: "Remove the Dev Kit dependency and pure apply scripts",
    });
  }
  const workflows = yield* patchWorkflows(projectDir);

  actions.push(...workflows.actions);
  conflicts.push(...workflows.conflicts);
  const agentsPath = path.join(projectDir, "AGENTS.md");

  if (yield* fs.exists(agentsPath)) {
    const rawAgents = yield* fs.readFileString(agentsPath);
    const unwrapped = unwrapManagedAgentInstructions(rawAgents);

    if (unwrapped.type === "conflict") conflicts.push(unwrapped.message);
    else if (unwrapped.type === "write" && unwrapped.content !== rawAgents) {
      actions.push({
        type: "write",
        path: "AGENTS.md",
        destination: agentsPath,
        content: unwrapped.content,
        label: "Release agent instructions",
      });
    }
  }
  const legacySkills = yield* planLegacySkills(
    projectDir,
    resolved.target.absolute,
    lock.toolVersion,
    lock.outputs.filter((output): output is LegacyManagedSkillOutput => "skill" in output),
  );

  actions.push(...legacySkills.actions);
  conflicts.push(...legacySkills.conflicts);
  actions.push({
    type: "remove",
    path: resolved.manifest.relative,
    destination: resolved.manifest.absolute,
    label: "Remove legacy manifest",
  });
  actions.push({
    type: "remove",
    path: resolved.lock.relative,
    destination: resolved.lock.absolute,
    label: "Remove legacy lock",
  });
  const stateObserved = yield* observePath(resolved.state.absolute);

  if (stateObserved.kind === "file") {
    actions.push({
      type: "remove",
      path: resolved.state.relative,
      destination: resolved.state.absolute,
      label: "Remove local ownership state",
    });
  } else if (stateObserved.kind !== "missing") {
    conflicts.push(`${resolved.state.relative} is not a regular file`);
  }

  return { projectDir, actions, conflicts } satisfies EjectPlan;
});

const writeAtomically = Effect.fn("writeEjectedFileAtomically")(function* (
  destination: string,
  content: string,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const staged = yield* fs.makeTempFileScoped({
    directory: path.dirname(destination),
    prefix: ".dev-kit-eject-",
  });

  yield* fs.writeFileString(staged, content);
  yield* fs.rename(staged, destination);
});

const applyEjectPlan = Effect.fn("applyEjectPlan")(function* (plan: EjectPlan) {
  if (plan.conflicts.length > 0) {
    return yield* EjectError.make({
      message: `eject has ${plan.conflicts.length} conflict${plan.conflicts.length === 1 ? "" : "s"}:\n${plan.conflicts.map((conflict) => `  ${conflict}`).join("\n")}`,
    });
  }
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  for (const action of plan.actions) {
    if (action.type === "remove") continue;
    if (action.type === "write") {
      yield* fs.makeDirectory(path.dirname(action.destination), { recursive: true });
      yield* writeAtomically(action.destination, action.content);
    } else {
      const temp = yield* fs.makeTempDirectoryScoped({
        directory: plan.projectDir,
        prefix: ".dev-kit-eject-skill-",
      });
      const staged = path.join(temp, path.basename(action.destination));

      yield* fs.copy(action.source, staged, { overwrite: true });
      yield* fs.writeFileString(
        path.join(staged, SKILL_ORIGIN_FILE),
        renderSkillOrigin(action.origin),
      );
      yield* fs.makeDirectory(path.dirname(action.destination), { recursive: true });
      if (action.replaceSymlink) yield* fs.remove(action.destination);
      yield* fs.rename(staged, action.destination);
    }
    yield* printStatus("success", action.label, action.path);
  }
  for (const action of plan.actions) {
    if (action.type !== "remove") continue;
    yield* fs.remove(action.destination);
    yield* printStatus("success", action.label, action.path);
  }
  yield* printDetail(
    "Regenerate the package-manager lockfile, then run the repository's full validation.",
  );
});

export const runEject = Effect.fn("runEject")(function* (options: EjectOptions = {}) {
  const plan = yield* planEject(options);

  for (const action of plan.actions) {
    yield* printStatus("plan", action.label, action.path);
  }
  for (const conflict of plan.conflicts) {
    yield* printStatus("error", conflict);
  }
  if (options.dryRun) {
    if (plan.conflicts.length === 0) yield* printDetail("Ready to eject.");

    return;
  }

  yield* applyEjectPlan(plan);
});
