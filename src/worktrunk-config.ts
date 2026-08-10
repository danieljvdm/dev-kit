import { Effect, FileSystem, Path, Schema } from "effect";

import { observeSymbolicLink } from "./node-symbolic-link.ts";
import {
  detectPackageManager,
  PACKAGE_MANAGER_COMMANDS,
  readDirectDependencyNames,
  readProjectPackage,
} from "./project-package.ts";
import { replaceUniqueTemplateMarker } from "./vite-plus-quality.ts";

export const WORKTRUNK_CONFIG_PATH = ".config/wt.toml";
export const WORKTRUNK_CONFIG_TEMPLATE = "templates/worktrunk/wt.toml";

export class WorktrunkConfigSupportError extends Schema.TaggedError<WorktrunkConfigSupportError>()(
  "WorktrunkConfigSupportError",
  { message: Schema.String },
) {}

export type WorktrunkConfigCommands = {
  readonly preMerge: string;
  readonly install: string;
  readonly dev: string;
};

export type WorktrunkConfigPlan = {
  readonly action: "scaffold" | "unchanged";
  readonly path: string;
  readonly destination: string;
  readonly content?: string;
};

const TEMPLATE_COMMANDS: WorktrunkConfigCommands = {
  preMerge: "vp run check",
  install: "vp install",
  dev: "vp dev",
};

export const renderWorktrunkConfigTemplate = (
  template: string,
  commands: WorktrunkConfigCommands = TEMPLATE_COMMANDS,
): string => {
  const replacements: ReadonlyArray<readonly [string, string]> = [
    [`pre-merge = "${TEMPLATE_COMMANDS.preMerge}"`, `pre-merge = "${commands.preMerge}"`],
    [`install = "${TEMPLATE_COMMANDS.install}"`, `install = "${commands.install}"`],
    [TEMPLATE_COMMANDS.dev, commands.dev],
  ];
  let rendered = template;

  for (const [marker, replacement] of replacements) {
    if (marker === replacement) continue;
    rendered = replaceUniqueTemplateMarker(rendered, marker, replacement);
  }

  return rendered;
};

export const resolveWorktrunkConfigCommands = Effect.fn("resolveWorktrunkConfigCommands")(
  function* (projectDir: string) {
    const dependencies = yield* readDirectDependencyNames(projectDir);

    if (dependencies.includes("vite-plus")) return TEMPLATE_COMMANDS;
    const projectPackage = yield* readProjectPackage(projectDir).pipe(
      Effect.catchTag("ProjectPackageError", (error) =>
        error.message.startsWith("package.json not found:") ? Effect.void : Effect.fail(error),
      ),
    );
    const scripts = projectPackage?.scripts ?? {};

    if (scripts["check"] === undefined) {
      return yield* WorktrunkConfigSupportError.make({
        message:
          'setup.worktrunk.config requires a direct vite-plus dependency or a root "check" package script for the pre-merge hook',
      });
    }
    const manager = yield* detectPackageManager(projectDir, projectPackage?.packageManager);

    return {
      preMerge: "bun run check",
      install: PACKAGE_MANAGER_COMMANDS[manager ?? "bun"].install,
      dev: "bun run dev",
    } satisfies WorktrunkConfigCommands;
  },
);

// The config is a scaffold, not a managed output: dev-kit creates it once and
// the repository owns it afterwards, so an existing destination is never read,
// compared, updated, or removed.
export const planWorktrunkConfig = Effect.fn("planWorktrunkConfig")(function* (
  packageRoot: string,
  projectDir: string,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const destination = path.join(projectDir, ...WORKTRUNK_CONFIG_PATH.split("/"));
  const observed = yield* observeSymbolicLink(destination);

  if (observed.kind !== "missing") {
    return {
      action: "unchanged",
      path: WORKTRUNK_CONFIG_PATH,
      destination,
    } satisfies WorktrunkConfigPlan;
  }
  const templatePath = path.join(packageRoot, WORKTRUNK_CONFIG_TEMPLATE);

  if (!(yield* fs.exists(templatePath))) {
    return yield* WorktrunkConfigSupportError.make({
      message: `dev-kit worktrunk config template is missing: ${WORKTRUNK_CONFIG_TEMPLATE}`,
    });
  }
  const template = yield* fs.readFileString(templatePath);
  const commands = yield* resolveWorktrunkConfigCommands(projectDir);

  return {
    action: "scaffold",
    path: WORKTRUNK_CONFIG_PATH,
    destination,
    content: renderWorktrunkConfigTemplate(template, commands),
  } satisfies WorktrunkConfigPlan;
});

export const applyWorktrunkConfigPlan = Effect.fn("applyWorktrunkConfigPlan")(function* (
  plan: WorktrunkConfigPlan,
) {
  if (plan.action !== "scaffold" || plan.content === undefined) return;
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  yield* fs.makeDirectory(path.dirname(plan.destination), { recursive: true });
  yield* fs.writeFileString(plan.destination, plan.content);
});
