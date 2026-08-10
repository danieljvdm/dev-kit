import { Effect, Schema } from "effect";

import { readDirectDependencyNames } from "./project-package.ts";
import { planScaffold, readScaffoldTemplate, replaceUniqueTemplateMarker } from "./scaffold.ts";
import { validateInstalledVitePlus } from "./vite-plus-dependency.ts";

export const VITE_PLUS_GITHUB_ACTIONS_PATH = ".github/workflows/check.yml";
export const VITE_PLUS_GITHUB_ACTIONS_TEMPLATE = "templates/vite-plus/github-actions-check.yml";

export class VitePlusWorkflowSupportError extends Schema.TaggedError<VitePlusWorkflowSupportError>()(
  "VitePlusWorkflowSupportError",
  { message: Schema.String },
) {}

const LOCKED_DEV_KIT_COMMAND =
  "bun ./node_modules/@danieljvdm/dev-kit/bin/dev-kit.mjs apply --locked";

export const renderVitePlusWorkflowTemplate = (
  template: string,
  options: { readonly devKitCommand?: string } = {},
): string => {
  const devKitCommand = options.devKitCommand;

  return devKitCommand === undefined || devKitCommand === LOCKED_DEV_KIT_COMMAND
    ? template
    : replaceUniqueTemplateMarker(template, LOCKED_DEV_KIT_COMMAND, devKitCommand);
};

export const validateVitePlusWorkflowSupport = Effect.fn("validateVitePlusWorkflowSupport")(
  function* (projectDir: string, packageRoot: string, typescriptPackage: string) {
    const dependencies = yield* readDirectDependencyNames(projectDir);
    const required = new Set(["effect", "@effect/tsgo", typescriptPackage]);

    yield* validateInstalledVitePlus(projectDir).pipe(
      Effect.mapError((error) => VitePlusWorkflowSupportError.make({ message: error.message })),
    );

    if (projectDir !== packageRoot) required.add("@danieljvdm/dev-kit");
    const missing = [...required].filter((dependency) => !dependencies.includes(dependency));

    if (missing.length > 0) {
      return yield* VitePlusWorkflowSupportError.make({
        message: `setup.vitePlus.workflow requires direct dependencies: ${missing.join(", ")}`,
      });
    }
  },
);

export const planVitePlusWorkflow = (options: {
  readonly packageRoot: string;
  readonly projectDir: string;
  readonly effectTsgoEnabled: boolean;
  readonly typescriptPackage: string;
}) =>
  planScaffold({
    projectDir: options.projectDir,
    path: VITE_PLUS_GITHUB_ACTIONS_PATH,
    content: Effect.gen(function* () {
      if (!options.effectTsgoEnabled) {
        return yield* VitePlusWorkflowSupportError.make({
          message:
            "setup.vitePlus.workflow requires setup.effectTsgo.enabled so the scaffolded workflow's typecheck uses the Effect-patched compiler",
        });
      }
      yield* validateVitePlusWorkflowSupport(
        options.projectDir,
        options.packageRoot,
        options.typescriptPackage,
      );
      const template = yield* readScaffoldTemplate(
        options.packageRoot,
        VITE_PLUS_GITHUB_ACTIONS_TEMPLATE,
      );

      return renderVitePlusWorkflowTemplate(
        template,
        options.projectDir === options.packageRoot
          ? { devKitCommand: "./bin/dev-kit.mjs apply --locked" }
          : {},
      );
    }),
  });
