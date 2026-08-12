import { NodeServices } from "@effect/platform-node";
import { assert, describe, layer } from "@effect/vitest";
import { Crypto, Effect, Encoding, FileSystem, Path } from "effect";

import { EFFECT_TSGO_TYPESCRIPT_VERSION, EFFECT_TSGO_VERSION } from "../src/effect-tsgo.ts";
import { runDevKit } from "./test-platform.ts";

type ManifestOptions = {
  readonly agentInstructionsEnabled?: boolean;
  readonly agentsEnabled?: boolean;
  readonly claudeInstructionsEnabled?: boolean;
  readonly claudeEnabled?: boolean;
  readonly devKitEnabled?: boolean;
  readonly effectTsgoEnabled?: boolean;
};

const writeManifest = Effect.fn("writeSyncTestManifest")(function* (
  projectDir: string,
  options: ManifestOptions = {},
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const hasSetup =
    options.agentInstructionsEnabled ||
    options.effectTsgoEnabled ||
    options.claudeInstructionsEnabled;
  const setup = {
    agentInstructions: options.agentInstructionsEnabled ? { enabled: true } : undefined,
    claudeInstructions: options.claudeInstructionsEnabled ? { enabled: true } : undefined,
    effectTsgo: options.effectTsgoEnabled ? { enabled: true } : undefined,
  };

  yield* fs.writeFileString(
    path.join(projectDir, "dev-kit.jsonc"),
    `${JSON.stringify(
      {
        include: ["effect", ...(options.devKitEnabled ? ["dev-kit"] : [])],
        setup: hasSetup ? setup : undefined,
        targets: {
          agents: { enabled: options.agentsEnabled ?? true, mode: "copy" },
          claude: { enabled: options.claudeEnabled ?? false, mode: "symlink" },
        },
      },
      null,
      2,
    )}\n`,
  );
});

const createProject = Effect.fn("createSyncTestProject")(function* () {
  const fs = yield* FileSystem.FileSystem;
  const projectDir = yield* fs.makeTempDirectoryScoped({
    prefix: "dev-kit-sync-test-",
  });

  yield* writeManifest(projectDir);

  return projectDir;
});

const writePackageVersion = Effect.fn("writeSyncTestPackageVersion")(function* (
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

const installFakeEffectTsgo = Effect.fn("installFakeEffectTsgo")(function* (projectDir: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  yield* writePackageVersion(projectDir, "@effect/tsgo", EFFECT_TSGO_VERSION);
  yield* writePackageVersion(projectDir, "typescript", EFFECT_TSGO_TYPESCRIPT_VERSION);

  const platform = "test-platform";
  const typescriptPlatformPackage = `@typescript/typescript-${platform}`;
  const effectPlatformPackage = `@effect/tsgo-${platform}`;

  yield* writePackageVersion(projectDir, typescriptPlatformPackage, EFFECT_TSGO_TYPESCRIPT_VERSION);
  yield* writePackageVersion(projectDir, effectPlatformPackage, EFFECT_TSGO_VERSION);

  const platformLib = path.join(
    projectDir,
    "node_modules",
    "@typescript",
    `typescript-${platform}`,
    "lib",
  );
  const effectPlatformLib = path.join(
    projectDir,
    "node_modules",
    "@effect",
    `tsgo-${platform}`,
    "lib",
  );

  yield* fs.makeDirectory(platformLib, { recursive: true });
  yield* fs.makeDirectory(effectPlatformLib, { recursive: true });
  yield* fs.writeFileString(path.join(platformLib, "tsc"), "original\n");
  yield* fs.writeFileString(path.join(effectPlatformLib, "tsc"), "patched\n");

  const executable = path.join(projectDir, "node_modules", ".bin", "effect-tsgo");

  yield* fs.makeDirectory(path.dirname(executable), { recursive: true });
  yield* fs.writeFileString(
    executable,
    `#!/bin/sh
set -eu
marker="$PWD/tsgo-patch-count.txt"
count=0
if [ -f "$marker" ]; then count="$(tr -d '\\n' < "$marker")"; fi
printf '%s' "$((count + 1))" > "$marker"
cp "$PWD/node_modules/${typescriptPlatformPackage}/lib/tsc" "$PWD/node_modules/${typescriptPlatformPackage}/lib/tsc.original"
cp "$PWD/node_modules/${effectPlatformPackage}/lib/tsc" "$PWD/node_modules/${typescriptPlatformPackage}/lib/tsc"
printf 'Verification succeeded.\\n'
`,
    { mode: 0o755 },
  );
});

const rawModeFileDigest = Effect.fn("rawModeFileDigest")(function* (value: string, mode: number) {
  const crypto = yield* Crypto.Crypto;
  const encoder = new TextEncoder();
  const frame = (input: string): Uint8Array => {
    const bytes = encoder.encode(input);
    const framed = new Uint8Array(4 + bytes.length);

    new DataView(framed.buffer).setUint32(0, bytes.length);
    framed.set(bytes, 4);

    return framed;
  };
  const frames = ["file-v1", String(mode), value].map(frame);
  const combined = new Uint8Array(frames.reduce((length, bytes) => length + bytes.length, 0));
  let offset = 0;

  for (const bytes of frames) {
    combined.set(bytes, offset);
    offset += bytes.length;
  }

  return `sha256:${Encoding.encodeHex(yield* crypto.digest("SHA-256", combined))}`;
});

const createInstructionProject = Effect.fn("createInstructionProject")(function* () {
  const path = yield* Path.Path;
  const projectDir = yield* createProject();

  yield* writeManifest(projectDir, { agentInstructionsEnabled: true });
  const result = yield* runDevKit(projectDir, ["apply", "--project-dir", projectDir]);

  assert.strictEqual(result.exitCode, 0, result.output);

  return {
    instructionsPath: path.join(projectDir, "AGENTS.md"),
    projectDir,
    statePath: path.join(projectDir, ".dev-kit"),
  };
});

const createLockedInstructionFixture = Effect.fn("createLockedInstructionFixture")(function* (
  mode: number,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const fixture = yield* createInstructionProject();
  const oldContent = `${yield* fs.readFileString(fixture.instructionsPath)}old release\n`;

  yield* fs.writeFileString(fixture.instructionsPath, oldContent, { mode });
  yield* fs.chmod(fixture.instructionsPath, mode);
  const lockPath = path.join(fixture.projectDir, "dev-kit.lock.json");
  const lock = JSON.parse(yield* fs.readFileString(lockPath));
  const instructions = lock.outputs.find(
    (output: { resourceId: string }) => output.resourceId === "setup:agent-instructions",
  );

  assert.isDefined(instructions);
  instructions.digest = yield* rawModeFileDigest(oldContent, mode);
  yield* fs.writeFileString(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
  yield* fs.remove(fixture.statePath, { force: true, recursive: true });

  return fixture;
});

describe("project apply", () => {
  layer(NodeServices.layer)((it) => {
    it.effect("rejects obsolete Vite+ quality config manifest input", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const projectDir = yield* fs.makeTempDirectoryScoped({
          prefix: "dev-kit-obsolete-quality-config-",
        });

        yield* fs.writeFileString(
          path.join(projectDir, "dev-kit.jsonc"),
          JSON.stringify({
            include: [],
            setup: {
              vitePlus: {
                quality: {
                  workflow: { enabled: false },
                },
              },
            },
          }),
        );
        const result = yield* runDevKit(projectDir, ["plan", "--project-dir", projectDir]);

        assert.notStrictEqual(result.exitCode, 0);
        assert.include(result.output, "quality");
        assert.match(result.output, /excess property|Unexpected key/i);
      }),
    );

    it.effect("runs the Effect tsgo setup once with a hoisted npm toolchain", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const projectDir = yield* createProject();

        yield* installFakeEffectTsgo(projectDir);
        yield* writeManifest(projectDir, { effectTsgoEnabled: true });
        const marker = path.join(projectDir, "tsgo-patch-count.txt");

        const planned = yield* runDevKit(projectDir, ["plan", "--project-dir", projectDir]);

        assert.strictEqual(planned.exitCode, 0, planned.output);
        assert.include(
          planned.output,
          `TypeScript patch @effect/tsgo@${EFFECT_TSGO_VERSION} → typescript@${EFFECT_TSGO_TYPESCRIPT_VERSION}`,
        );
        assert.isFalse(yield* fs.exists(marker));

        const applied = yield* runDevKit(projectDir, ["apply", "--project-dir", projectDir]);

        assert.strictEqual(applied.exitCode, 0, applied.output);
        assert.match(applied.output, /✓ Dev kit ready 6 changes/);
        assert.notMatch(applied.output, /Verification succeeded|Backed up original binary/);
        assert.strictEqual(yield* fs.readFileString(marker), "1");

        const lockPath = path.join(projectDir, "dev-kit.lock.json");
        const lock = JSON.parse(yield* fs.readFileString(lockPath));

        assert.deepEqual(lock.setup.effectTsgo, {
          effectTsgoVersion: EFFECT_TSGO_VERSION,
          typescriptPackage: "typescript",
          typescriptVersion: EFFECT_TSGO_TYPESCRIPT_VERSION,
        });

        const postinstall = yield* runDevKit(projectDir, [
          "apply",
          "--locked",
          "--project-dir",
          projectDir,
        ]);

        assert.strictEqual(postinstall.exitCode, 0, postinstall.output);
        assert.match(postinstall.output, /Dev kit up to date/);
        assert.strictEqual(yield* fs.readFileString(marker), "1");

        lock.setup.effectTsgo.effectTsgoVersion = "0.0.0";
        yield* fs.writeFileString(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
        const mismatched = yield* runDevKit(projectDir, [
          "apply",
          "--locked",
          "--project-dir",
          projectDir,
        ]);

        assert.notStrictEqual(mismatched.exitCode, 0);
        assert.match(mismatched.output, /manifest or packaged skills differ/);
      }),
    );

    it.effect("updates a locked output after packaged content changes without local state", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const fixture = yield* createLockedInstructionFixture(0o644);
        const result = yield* runDevKit(fixture.projectDir, [
          "apply",
          "--project-dir",
          fixture.projectDir,
        ]);

        assert.strictEqual(result.exitCode, 0, result.output);
        assert.notInclude(yield* fs.readFileString(fixture.instructionsPath), "old release");
      }),
    );

    it.effect(
      "preserves handwritten content added outside managed sections without local state",
      () =>
        Effect.gen(function* () {
          const fs = yield* FileSystem.FileSystem;
          const fixture = yield* createInstructionProject();

          yield* fs.writeFileString(
            fixture.instructionsPath,
            `${yield* fs.readFileString(fixture.instructionsPath)}local edit\n`,
          );
          yield* fs.remove(fixture.statePath, { force: true, recursive: true });

          const result = yield* runDevKit(fixture.projectDir, [
            "apply",
            "--project-dir",
            fixture.projectDir,
          ]);

          assert.strictEqual(result.exitCode, 0, result.output);
          assert.include(yield* fs.readFileString(fixture.instructionsPath), "local edit");
        }),
    );

    it.effect("points agent instructions at the managed Dev Kit skill", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const projectDir = yield* createProject();

        yield* writeManifest(projectDir, {
          agentInstructionsEnabled: true,
          devKitEnabled: true,
        });

        const result = yield* runDevKit(projectDir, ["apply", "--project-dir", projectDir]);
        const instructions = yield* fs.readFileString(path.join(projectDir, "AGENTS.md"));

        assert.strictEqual(result.exitCode, 0, result.output);
        assert.include(instructions, ".agents/skills/dev-kit/SKILL.md");
        assert.notInclude(instructions, "node_modules/");
      }),
    );
  });
});
