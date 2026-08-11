import { NodeServices } from "@effect/platform-node";
import { assert, describe, layer } from "@effect/vitest";
import { Effect, FileSystem, Path } from "effect";

import {
  EFFECT_TSGO_TYPESCRIPT_VERSION,
  EFFECT_TSGO_VERSION,
  planEffectTsgoPatch,
  recommendedEffectTsgoPlugin,
} from "../src/effect-tsgo.ts";

const installIsolatedPatchedToolchain = Effect.fn("installIsolatedPatchedToolchain")(function* (
  projectDir: string,
  storeName: ".bun" | ".pnpm",
  options: { readonly stale?: boolean } = {},
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const platform = "test-platform";
  const store = path.join(projectDir, "node_modules", storeName);
  const typescriptRoot = path.join(
    store,
    `typescript@${EFFECT_TSGO_TYPESCRIPT_VERSION}`,
    "node_modules",
    "typescript",
  );
  const typescriptPlatformRoot = path.join(
    store,
    `@typescript+typescript-${platform}@${EFFECT_TSGO_TYPESCRIPT_VERSION}`,
    "node_modules",
    "@typescript",
    `typescript-${platform}`,
  );
  const effectTsgoRoot = path.join(
    store,
    `@effect+tsgo@${EFFECT_TSGO_VERSION}`,
    "node_modules",
    "@effect",
    "tsgo",
  );
  const effectPlatformRoot = path.join(
    store,
    `@effect+tsgo-${platform}@${EFFECT_TSGO_VERSION}`,
    "node_modules",
    "@effect",
    `tsgo-${platform}`,
  );

  for (const [root, name, version] of [
    [typescriptRoot, "typescript", EFFECT_TSGO_TYPESCRIPT_VERSION],
    [typescriptPlatformRoot, `@typescript/typescript-${platform}`, EFFECT_TSGO_TYPESCRIPT_VERSION],
    [effectTsgoRoot, "@effect/tsgo", EFFECT_TSGO_VERSION],
    [effectPlatformRoot, `@effect/tsgo-${platform}`, EFFECT_TSGO_VERSION],
  ] as const) {
    yield* fs.makeDirectory(root, { recursive: true });
    yield* fs.writeFileString(
      path.join(root, "package.json"),
      `${JSON.stringify({ name, version })}\n`,
    );
  }

  const executableName = path.sep === "\\" ? "tsc.exe" : "tsc";
  const installedExecutable = path.join(typescriptPlatformRoot, "lib", executableName);

  yield* fs.makeDirectory(path.join(typescriptPlatformRoot, "lib"), { recursive: true });
  yield* fs.makeDirectory(path.join(effectPlatformRoot, "lib"), { recursive: true });
  yield* fs.writeFileString(installedExecutable, options.stale ? "stale\n" : "patched\n");
  yield* fs.writeFileString(path.join(effectPlatformRoot, "lib", executableName), "patched\n");
  if (options.stale) yield* fs.writeFileString(`${installedExecutable}.original`, "original\n");

  const typescriptDependencies = path.join(path.dirname(typescriptRoot), "@typescript");
  const effectDependencies = path.join(path.dirname(path.dirname(effectTsgoRoot)), "@effect");

  yield* fs.makeDirectory(typescriptDependencies, { recursive: true });
  yield* fs.makeDirectory(effectDependencies, { recursive: true });
  yield* fs.symlink(
    typescriptPlatformRoot,
    path.join(typescriptDependencies, `typescript-${platform}`),
  );
  yield* fs.symlink(effectPlatformRoot, path.join(effectDependencies, `tsgo-${platform}`));

  yield* fs.makeDirectory(path.join(projectDir, "node_modules", "@effect"), {
    recursive: true,
  });
  yield* fs.symlink(typescriptRoot, path.join(projectDir, "node_modules", "typescript"));
  yield* fs.symlink(effectTsgoRoot, path.join(projectDir, "node_modules", "@effect", "tsgo"));
  const executable = path.join(projectDir, "node_modules", ".bin", "effect-tsgo");

  yield* fs.makeDirectory(path.dirname(executable), { recursive: true });
  yield* fs.writeFileString(executable, "fixture\n");
});

describe("Effect tsgo patch", () => {
  layer(NodeServices.layer)((it) => {
    it.effect("exports the recommended diagnostic profile", () =>
      Effect.sync(() => {
        assert.deepEqual(recommendedEffectTsgoPlugin.diagnosticSeverity, {
          anyUnknownInErrorContext: "warning",
          instanceOfSchema: "suggestion",
          nestedEffectGenYield: "suggestion",
          newSchemaClass: "suggestion",
          preferSchemaTypeProperty: "suggestion",
          unsafeEffectTypeAssertion: "warning",
        });
        assert.deepEqual(recommendedEffectTsgoPlugin.overrides, [
          {
            include: ["src/**/*.ts"],
            options: {
              diagnosticSeverity: {
                nodeBuiltinImport: "warning",
                preferSchemaOverJson: "suggestion",
              },
            },
          },
        ]);
      }),
    );

    it.effect("recognizes an already-patched Bun toolchain", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const projectDir = yield* fs.makeTempDirectoryScoped({
          prefix: "dev-kit-tsgo-bun-test-",
        });

        yield* installIsolatedPatchedToolchain(projectDir, ".bun");

        const plan = yield* planEffectTsgoPatch({ projectDir });

        assert.isTrue(plan.alreadyPatched);
      }),
    );

    it.effect("recognizes an already-patched pnpm toolchain", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const projectDir = yield* fs.makeTempDirectoryScoped({
          prefix: "dev-kit-tsgo-pnpm-test-",
        });

        yield* installIsolatedPatchedToolchain(projectDir, ".pnpm");

        const plan = yield* planEffectTsgoPatch({ projectDir });

        assert.isTrue(plan.alreadyPatched);
      }),
    );
  });
});
