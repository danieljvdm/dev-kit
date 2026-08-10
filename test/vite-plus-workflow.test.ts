import { NodeServices } from "@effect/platform-node";
import { assert, describe, layer } from "@effect/vitest";
import { Effect, FileSystem, Path } from "effect";
import semver from "semver";

import { EFFECT_TSGO_TYPESCRIPT_VERSION, EFFECT_TSGO_VERSION } from "../src/effect-tsgo.ts";
import { VITE_PLUS_SUPPORTED_RANGE, VITE_PLUS_TESTED_VERSION } from "../src/tool-metadata.ts";
import {
  renderVitePlusWorkflowTemplate,
  VITE_PLUS_GITHUB_ACTIONS_PATH,
  VITE_PLUS_GITHUB_ACTIONS_TEMPLATE,
} from "../src/vite-plus-workflow.ts";
import { repositoryRoot, runCommandSuccess, runDevKit } from "./test-platform.ts";

const VITE_CONFIG_PATH = "vite.config.ts";
const FAKE_DIGEST = `sha256:${"0".repeat(64)}`;

const writePackageVersion = Effect.fn("writeWorkflowTestPackageVersion")(function* (
  projectDir: string,
  packageName: string,
  version: string,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const packageDir = path.join(projectDir, "node_modules", ...packageName.split("/"));

  yield* fs.makeDirectory(packageDir, { recursive: true });
  yield* fs.writeFileString(
    path.join(packageDir, "package.json"),
    `${JSON.stringify({ version })}\n`,
  );
});

const installSupportedToolchain = Effect.fn("installWorkflowTestToolchain")(function* (
  projectDir: string,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  yield* writePackageVersion(projectDir, "@effect/tsgo", EFFECT_TSGO_VERSION);
  yield* writePackageVersion(projectDir, "typescript", EFFECT_TSGO_TYPESCRIPT_VERSION);
  yield* writePackageVersion(projectDir, "vite-plus", VITE_PLUS_TESTED_VERSION);
  const platform = "test-platform";
  const typescriptPlatformPackage = `@typescript/typescript-${platform}`;
  const effectPlatformPackage = `@effect/tsgo-${platform}`;

  yield* writePackageVersion(projectDir, typescriptPlatformPackage, EFFECT_TSGO_TYPESCRIPT_VERSION);
  yield* writePackageVersion(projectDir, effectPlatformPackage, EFFECT_TSGO_VERSION);
  const typescriptLib = path.join(
    projectDir,
    "node_modules",
    "@typescript",
    `typescript-${platform}`,
    "lib",
  );
  const effectLib = path.join(projectDir, "node_modules", "@effect", `tsgo-${platform}`, "lib");

  yield* fs.makeDirectory(typescriptLib, { recursive: true });
  yield* fs.makeDirectory(effectLib, { recursive: true });
  yield* fs.writeFileString(path.join(typescriptLib, "tsc"), "original\n");
  yield* fs.writeFileString(path.join(effectLib, "tsc"), "patched\n");
  const binDir = path.join(projectDir, "node_modules", ".bin");

  yield* fs.makeDirectory(binDir, { recursive: true });
  yield* fs.writeFileString(
    path.join(binDir, "effect-tsgo"),
    `#!/bin/sh
set -eu
cp "$PWD/node_modules/${effectPlatformPackage}/lib/tsc" "$PWD/node_modules/${typescriptPlatformPackage}/lib/tsc"
`,
    { mode: 0o755 },
  );
  yield* fs.writeFileString(path.join(binDir, "vp"), "#!/bin/sh\nexit 0\n", { mode: 0o755 });
});

const writeFixture = Effect.fn("writeWorkflowTestFixture")(function* (
  projectDir: string,
  options: {
    readonly workflow?: boolean;
    readonly effectTsgo?: boolean;
    readonly completeDependencies?: boolean;
  } = {},
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const completeDependencies = options.completeDependencies ?? true;

  yield* fs.writeFileString(
    path.join(projectDir, "dev-kit.jsonc"),
    `${JSON.stringify(
      {
        include: [],
        setup: {
          effectTsgo: { enabled: options.effectTsgo ?? true },
          vitePlus: { workflow: { enabled: options.workflow ?? true } },
        },
        targets: { agents: { enabled: false } },
      },
      null,
      2,
    )}\n`,
  );
  yield* fs.writeFileString(
    path.join(projectDir, "package.json"),
    `${JSON.stringify(
      {
        name: "workflow-fixture",
        dependencies: completeDependencies
          ? { "@danieljvdm/dev-kit": "0.11.3", effect: "4.0.0-beta.105" }
          : {},
        devDependencies: completeDependencies
          ? {
              "@effect/tsgo": EFFECT_TSGO_VERSION,
              typescript: EFFECT_TSGO_TYPESCRIPT_VERSION,
              "vite-plus": VITE_PLUS_TESTED_VERSION,
            }
          : {},
      },
      null,
      2,
    )}\n`,
  );
});

const createFixture = Effect.fn("createWorkflowTestFixture")(function* () {
  const fs = yield* FileSystem.FileSystem;
  const projectDir = yield* fs.makeTempDirectoryScoped({ prefix: "dev-kit-workflow-test-" });

  yield* runCommandSuccess(projectDir, "git", ["init", "--initial-branch", "main"]);
  yield* writeFixture(projectDir);
  yield* installSupportedToolchain(projectDir);

  return projectDir;
});

describe("Vite+ workflow setup", () => {
  layer(NodeServices.layer)((it) => {
    it.effect("tests a Vite+ version inside the advertised peer range", () =>
      Effect.sync(() => {
        assert.isTrue(semver.satisfies(VITE_PLUS_TESTED_VERSION, VITE_PLUS_SUPPORTED_RANGE));
      }),
    );

    it.effect("scaffolds the workflow without owning it or the Vite config", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const projectDir = yield* createFixture();
        const customConfig = "export default { custom: true };\n";

        yield* fs.writeFileString(path.join(projectDir, VITE_CONFIG_PATH), customConfig);
        const applied = yield* runDevKit(projectDir, ["apply", "--project-dir", projectDir]);

        assert.strictEqual(applied.exitCode, 0, applied.output);
        assert.strictEqual(
          yield* fs.readFileString(path.join(projectDir, VITE_CONFIG_PATH)),
          customConfig,
        );
        const workflow = yield* fs.readFileString(
          path.join(projectDir, VITE_PLUS_GITHUB_ACTIONS_PATH),
        );

        assert.include(workflow, "apply --locked");
        const lock = JSON.parse(
          yield* fs.readFileString(path.join(projectDir, "dev-kit.lock.json")),
        );

        assert.deepEqual(lock.outputs, []);
      }),
    );

    it.effect("never rewrites an existing repository-owned workflow", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const projectDir = yield* createFixture();
        const destination = path.join(projectDir, VITE_PLUS_GITHUB_ACTIONS_PATH);
        const customWorkflow = "name: Custom Check\non: [push]\n";

        yield* fs.makeDirectory(path.dirname(destination), { recursive: true });
        yield* fs.writeFileString(destination, customWorkflow);
        const applied = yield* runDevKit(projectDir, ["apply", "--project-dir", projectDir]);

        assert.strictEqual(applied.exitCode, 0, applied.output);
        assert.strictEqual(yield* fs.readFileString(destination), customWorkflow);
      }),
    );

    it.effect("releases a previously managed workflow to the repository on upgrade", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const projectDir = yield* createFixture();
        const destination = path.join(projectDir, VITE_PLUS_GITHUB_ACTIONS_PATH);
        const existingWorkflow = "name: Check\non: [push]\n";
        const legacyOutput = {
          resourceId: "setup:vite-plus-github-actions",
          path: VITE_PLUS_GITHUB_ACTIONS_PATH,
          sourcePath: VITE_PLUS_GITHUB_ACTIONS_TEMPLATE,
          mode: "copy",
          kind: "file",
          digest: FAKE_DIGEST,
        };

        yield* fs.makeDirectory(path.dirname(destination), { recursive: true });
        yield* fs.writeFileString(destination, existingWorkflow);
        yield* fs.writeFileString(
          path.join(projectDir, "dev-kit.lock.json"),
          `${JSON.stringify(
            {
              version: 1,
              toolVersion: "0.14.0",
              manifestDigest: FAKE_DIGEST,
              outputs: [legacyOutput],
            },
            null,
            2,
          )}\n`,
        );
        yield* fs.makeDirectory(path.join(projectDir, ".dev-kit"), { recursive: true });
        yield* fs.writeFileString(
          path.join(projectDir, ".dev-kit", "state.json"),
          `${JSON.stringify(
            {
              version: 1,
              appliedLockDigest: FAKE_DIGEST,
              outputs: [
                {
                  resourceId: "setup:vite-plus-github-actions",
                  path: VITE_PLUS_GITHUB_ACTIONS_PATH,
                  mode: "copy",
                  kind: "file",
                  digest: FAKE_DIGEST,
                },
              ],
            },
            null,
            2,
          )}\n`,
        );
        const applied = yield* runDevKit(projectDir, ["apply", "--project-dir", projectDir]);

        assert.strictEqual(applied.exitCode, 0, applied.output);
        assert.strictEqual(yield* fs.readFileString(destination), existingWorkflow);
        const lock = JSON.parse(
          yield* fs.readFileString(path.join(projectDir, "dev-kit.lock.json")),
        );

        assert.deepEqual(lock.outputs, []);
      }),
    );

    it.effect("leaves the scaffolded workflow in place when disabled", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const projectDir = yield* createFixture();
        const applied = yield* runDevKit(projectDir, ["apply", "--project-dir", projectDir]);

        assert.strictEqual(applied.exitCode, 0, applied.output);
        yield* writeFixture(projectDir, { workflow: false });
        const disabled = yield* runDevKit(projectDir, ["apply", "--project-dir", projectDir]);

        assert.strictEqual(disabled.exitCode, 0, disabled.output);
        assert.isTrue(yield* fs.exists(path.join(projectDir, VITE_PLUS_GITHUB_ACTIONS_PATH)));
      }),
    );

    it.effect("generates one frozen install followed by locked convergence", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const root = yield* repositoryRoot();
        const workflow = yield* fs.readFileString(
          path.join(root, VITE_PLUS_GITHUB_ACTIONS_TEMPLATE),
        );

        assert.strictEqual((workflow.match(/run-install:/g) ?? []).length, 1);
        assert.include(workflow, "oven-sh/setup-bun@v2");
        assert.include(workflow, "voidzero-dev/setup-vp@v1.16.1");
        assert.include(workflow, 'args: ["--frozen-lockfile", "--ignore-scripts"]');
        assert.include(workflow, "apply --locked");
        assert.include(
          renderVitePlusWorkflowTemplate(workflow, {
            devKitCommand: "./bin/dev-kit.mjs apply --locked",
          }),
          "run: ./bin/dev-kit.mjs apply --locked",
        );
      }),
    );

    it.effect("fails closed when the locked-command template marker drifts", () =>
      Effect.sync(() => {
        assert.throws(
          () =>
            renderVitePlusWorkflowTemplate("run: vp run check\n", {
              devKitCommand: "./bin/dev-kit.mjs apply --locked",
            }),
          /expected exactly one generated template marker/,
        );
      }),
    );

    it.effect("rejects unsupported workflow repositories before scaffolding", () =>
      Effect.gen(function* () {
        const projectDir = yield* createFixture();

        yield* writeFixture(projectDir, { effectTsgo: false });
        const disabled = yield* runDevKit(projectDir, ["plan", "--project-dir", projectDir]);

        assert.notStrictEqual(disabled.exitCode, 0);
        assert.match(disabled.output, /requires setup\.effectTsgo\.enabled/);
        yield* writeFixture(projectDir, { completeDependencies: false });
        const unsupported = yield* runDevKit(projectDir, ["plan", "--project-dir", projectDir]);

        assert.notStrictEqual(unsupported.exitCode, 0);
        assert.match(unsupported.output, /direct project dependency|requires direct dependencies/);
      }),
    );

    it.effect("rejects Vite+ versions outside the peer range", () =>
      Effect.gen(function* () {
        const projectDir = yield* createFixture();

        yield* writePackageVersion(projectDir, "vite-plus", "0.3.0");
        const result = yield* runDevKit(projectDir, ["plan", "--project-dir", projectDir]);

        assert.notStrictEqual(result.exitCode, 0);
        assert.include(result.output, "installed vite-plus 0.3.0 is incompatible");
      }),
    );
  });
});
