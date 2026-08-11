import { NodeServices } from "@effect/platform-node";
import { assert, describe, layer } from "@effect/vitest";
import { Effect, FileSystem, Path } from "effect";

import { runDevKit } from "./test-platform.ts";

const writeManifest = Effect.fn("writePackageSyncManifest")(function* (
  projectDir: string,
  mode: "copy" | "symlink" = "copy",
  targetPath?: string,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  yield* fs.writeFileString(
    path.join(projectDir, "dev-kit.jsonc"),
    `${JSON.stringify(
      {
        include: ["@tanstack/ai#ai-core"],
        targets: {
          agents: {
            enabled: true,
            mode,
            ...(targetPath === undefined ? {} : { path: targetPath }),
          },
        },
      },
      null,
      2,
    )}\n`,
  );
  yield* fs.writeFileString(
    path.join(projectDir, "package.json"),
    '{"dependencies":{"@tanstack/ai":"1.2.3"}}\n',
  );
});

const installTanStackAiSkill = Effect.fn("installTestTanStackAiSkill")(function* (
  projectDir: string,
  version: string,
  body = "Package content.\n",
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const packageRoot = path.join(projectDir, "node_modules", "@tanstack", "ai");
  const skillRoot = path.join(packageRoot, "skills", "ai-core");

  yield* fs.makeDirectory(path.join(skillRoot, "chat-experience"), { recursive: true });
  yield* fs.writeFileString(
    path.join(packageRoot, "package.json"),
    `${JSON.stringify({
      name: "@tanstack/ai",
      version,
      intent: {
        version: 1,
        repo: "https://github.com/TanStack/ai",
        docs: "https://tanstack.com/ai",
      },
    })}\n`,
  );
  yield* fs.writeFileString(
    path.join(skillRoot, "SKILL.md"),
    `---\nname: ai-core\ndescription: Test TanStack AI skill.\n---\n\n${body}`,
  );
  yield* fs.writeFileString(
    path.join(skillRoot, "chat-experience", "SKILL.md"),
    "---\nname: ai-core/chat-experience\ndescription: Nested topic.\n---\n\nNested.\n",
  );
});

describe("package-backed project sync", () => {
  layer(NodeServices.layer)((it) => {
    it.effect("moves a package skill when its target path changes", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const projectDir = yield* fs.makeTempDirectoryScoped({
          prefix: "dev-kit-package-move-",
        });

        yield* writeManifest(projectDir);
        yield* installTanStackAiSkill(projectDir, "1.2.3");
        const first = yield* runDevKit(projectDir, ["apply", "--project-dir", projectDir]);

        assert.strictEqual(first.exitCode, 0, first.output);
        yield* writeManifest(projectDir, "copy", ".custom/skills");
        const moved = yield* runDevKit(projectDir, ["apply", "--project-dir", projectDir]);

        assert.strictEqual(moved.exitCode, 0, moved.output);
        assert.isFalse(
          yield* fs.exists(path.join(projectDir, ".agents", "skills", "tanstack-ai-ai-core")),
        );
        assert.isTrue(
          yield* fs.exists(
            path.join(projectDir, ".custom", "skills", "tanstack-ai-ai-core", "SKILL.md"),
          ),
        );
        const lock = JSON.parse(
          yield* fs.readFileString(path.join(projectDir, "dev-kit.lock.json")),
        );
        const state = JSON.parse(
          yield* fs.readFileString(path.join(projectDir, ".dev-kit", "state.json")),
        );

        assert.deepEqual(
          lock.outputs.map((output: { readonly path: string }) => output.path),
          [".custom/skills/tanstack-ai-ai-core"],
        );
        assert.deepEqual(
          state.outputs.map((output: { readonly path: string }) => output.path),
          [".custom/skills/tanstack-ai-ai-core"],
        );
      }),
    );
  });
});
