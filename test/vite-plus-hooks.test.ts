import { NodeServices } from "@effect/platform-node";
import { assert, describe, layer } from "@effect/vitest";
import { Effect, FileSystem, Path } from "effect";

import { VITE_PLUS_TESTED_VERSION } from "../src/tool-metadata.ts";
import { runCommandSuccess, runDevKit } from "./test-platform.ts";

const writeFixture = Effect.fn("writeVitePlusHooksFixture")(function* (projectDir: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  yield* fs.writeFileString(path.join(projectDir, ".gitignore"), ".dev-kit/\nnode_modules/\n");
  yield* fs.writeFileString(
    path.join(projectDir, "dev-kit.jsonc"),
    `${JSON.stringify(
      {
        include: [],
        setup: { vitePlus: { hooks: { enabled: true } } },
        targets: { agents: { enabled: false } },
      },
      null,
      2,
    )}\n`,
  );
  yield* fs.writeFileString(
    path.join(projectDir, "package.json"),
    `${JSON.stringify({ devDependencies: { "vite-plus": VITE_PLUS_TESTED_VERSION } }, null, 2)}\n`,
  );
});

const installFakeVitePlus = Effect.fn("installFakeVitePlusHooks")(function* (
  projectDir: string,
  version = VITE_PLUS_TESTED_VERSION,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const executable = path.join(projectDir, "node_modules", ".bin", "vp");
  const packageDir = path.join(projectDir, "node_modules", "vite-plus");

  yield* fs.makeDirectory(path.dirname(executable), { recursive: true });
  yield* fs.makeDirectory(packageDir, { recursive: true });
  yield* fs.writeFileString(
    path.join(packageDir, "package.json"),
    `${JSON.stringify({ version })}\n`,
  );
  yield* fs.writeFileString(
    executable,
    `#!/bin/sh
set -eu
mkdir -p .vite-hooks/_
printf '#!/usr/bin/env sh\\nexit 0\\n' > .vite-hooks/_/h
printf '#!/usr/bin/env sh\\n. "$(dirname "$0")/h"\\n' > .vite-hooks/_/pre-commit
printf '*\\n' > .vite-hooks/_/.gitignore
chmod +x .vite-hooks/_/h .vite-hooks/_/pre-commit
if [ ! -f .vite-hooks/pre-commit ]; then printf 'vp staged\\n' > .vite-hooks/pre-commit; fi
git config core.hooksPath .vite-hooks/_
count=0
if [ -f .vite-hooks/_/config-count ]; then count="$(cat .vite-hooks/_/config-count)"; fi
printf '%s' "$((count + 1))" > .vite-hooks/_/config-count
`,
    { mode: 0o755 },
  );
});

describe("Vite+ hooks setup", () => {
  layer(NodeServices.layer)((it) => {
    it.effect("rejects an incompatible installed Vite+ version", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const projectDir = yield* fs.makeTempDirectoryScoped({
          prefix: "dev-kit-vite-hooks-version-test-",
        });

        yield* runCommandSuccess(projectDir, "git", ["init", "--initial-branch", "main"]);
        yield* writeFixture(projectDir);
        yield* installFakeVitePlus(projectDir, "0.3.0");
        const result = yield* runDevKit(projectDir, ["plan", "--project-dir", projectDir]);

        assert.notStrictEqual(result.exitCode, 0);
        assert.match(result.output, /installed vite-plus 0\.3\.0 is incompatible/);
      }),
    );
  });
});
