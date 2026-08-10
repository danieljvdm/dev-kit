import { Effect, Schema } from "effect";

import {
  detectPackageManager,
  PACKAGE_MANAGER_COMMANDS,
  readDirectDependencyNames,
  readProjectPackage,
} from "./project-package.ts";
import { planScaffold, readScaffoldTemplate, replaceUniqueTemplateMarker } from "./scaffold.ts";

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

export const planWorktrunkConfig = (packageRoot: string, projectDir: string) =>
  planScaffold({
    projectDir,
    path: WORKTRUNK_CONFIG_PATH,
    content: Effect.gen(function* () {
      const template = yield* readScaffoldTemplate(packageRoot, WORKTRUNK_CONFIG_TEMPLATE);
      const commands = yield* resolveWorktrunkConfigCommands(projectDir);

      return renderWorktrunkConfigTemplate(template, commands);
    }),
  });
