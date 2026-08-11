import { NodeServices } from "@effect/platform-node";
import { assert, describe, layer } from "@effect/vitest";
import { Effect, FileSystem, Path } from "effect";

import { runDevKit } from "./test-platform.ts";

describe("skill management UX", () => {
  layer(NodeServices.layer)((it) => {
    it.effect("keeps custom manifests inside the project and renders a relative schema path", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const projectDir = yield* fs.makeTempDirectoryScoped({
          prefix: "dev-kit-nested-manifest-",
        });

        const initialized = yield* runDevKit(projectDir, [
          "init",
          "--manifest",
          "config/dev-kit.jsonc",
          "--project-dir",
          projectDir,
        ]);

        assert.strictEqual(initialized.exitCode, 0, initialized.output);
        assert.include(
          yield* fs.readFileString(path.join(projectDir, "config", "dev-kit.jsonc")),
          '"$schema": "../node_modules/@danieljvdm/dev-kit/schema/dev-kit.schema.json"',
        );

        for (const manifest of ["../outside.jsonc", path.join(projectDir, "absolute.jsonc")]) {
          const rejected = yield* runDevKit(projectDir, [
            "init",
            "--manifest",
            manifest,
            "--project-dir",
            projectDir,
          ]);

          assert.notStrictEqual(rejected.exitCode, 0);
          assert.match(rejected.output, /--manifest must/);
        }
      }),
    );

    it.effect("refuses symlinked manifest paths without touching their targets", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const projectDir = yield* fs.makeTempDirectoryScoped({
          prefix: "dev-kit-symlink-manifest-",
        });
        const externalDir = yield* fs.makeTempDirectoryScoped({
          prefix: "dev-kit-external-manifest-",
        });
        const externalManifest = path.join(externalDir, "manifest.jsonc");

        yield* fs.writeFileString(externalManifest, "keep me\n");
        yield* fs.symlink(externalManifest, path.join(projectDir, "dev-kit.jsonc"));

        const rejected = yield* runDevKit(projectDir, ["init", "--project-dir", projectDir]);

        assert.notStrictEqual(rejected.exitCode, 0);
        assert.match(rejected.output, /manifest is a symlink/);
        assert.strictEqual(yield* fs.readFileString(externalManifest), "keep me\n");
      }),
    );
  });
});
