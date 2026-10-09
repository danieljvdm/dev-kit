import { NodeServices } from "@effect/platform-node";
import { assert, describe, layer } from "@effect/vitest";
import { Effect, FileSystem, Path } from "effect";

import { observeDirectoryWithoutEntry } from "../src/path-digest.ts";
import { SKILL_ORIGIN_FILE } from "../src/project-skills.ts";
import { runDevKit } from "./test-platform.ts";

const writePreviousPullRequestInstall = Effect.fn("writePreviousPullRequestInstall")(function* (
  projectDir: string,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const skillDir = path.join(projectDir, ".agents", "skills", "open-pull-request");

  yield* fs.makeDirectory(skillDir, { recursive: true });
  yield* fs.writeFileString(
    path.join(skillDir, "SKILL.md"),
    "---\nname: open-pull-request\ndescription: Old pull request skill.\n---\n\nOld body.\n",
  );
  const observed = yield* observeDirectoryWithoutEntry(skillDir, SKILL_ORIGIN_FILE);

  if (observed.kind !== "directory") {
    return yield* Effect.die(new Error("installed skill fixture is not a directory"));
  }
  yield* fs.writeFileString(
    path.join(skillDir, SKILL_ORIGIN_FILE),
    `${JSON.stringify(
      {
        version: 1,
        selector: "open-pull-request",
        name: "open-pull-request",
        baseDigest: observed.digest,
        source: { type: "bundled", version: "0.0.0" },
      },
      null,
      2,
    )}\n`,
  );

  return skillDir;
});

describe("bundled skill renames", () => {
  layer(NodeServices.layer)((it) => {
    it.effect("updates an open-pull-request receipt into pull-requests", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const projectDir = yield* fs.makeTempDirectoryScoped({ prefix: "dev-kit-skill-rename-" });

        yield* writePreviousPullRequestInstall(projectDir);
        const status = yield* runDevKit(projectDir, ["skills", "status"]);

        assert.strictEqual(status.exitCode, 0);
        assert.include(status.output, "update available; renamed to pull-requests");
        const diff = yield* runDevKit(projectDir, ["skills", "diff", "open-pull-request"]);

        assert.strictEqual(diff.exitCode, 0);
        assert.include(diff.output, "Old body.");
        const update = yield* runDevKit(projectDir, ["skills", "update", "open-pull-request"]);

        assert.strictEqual(update.exitCode, 0);
        assert.include(update.output, "renamed from open-pull-request");
        assert.isFalse(
          yield* fs.exists(path.join(projectDir, ".agents", "skills", "open-pull-request")),
        );
        const installed = path.join(projectDir, ".agents", "skills", "pull-requests");
        const document = yield* fs.readFileString(path.join(installed, "SKILL.md"));
        const origin = yield* fs.readFileString(path.join(installed, SKILL_ORIGIN_FILE));

        assert.include(document, "name: pull-requests");
        assert.notInclude(document, "yielded/auth");
        assert.include(origin, '"selector": "pull-requests"');
        assert.include(origin, '"name": "pull-requests"');
        assert.isFalse(yield* fs.exists(path.join(installed, "references", "effect.md")));
        assert.isFalse(yield* fs.exists(path.join(installed, "references", "private-tickets.md")));
        const after = yield* runDevKit(projectDir, ["skills", "status"]);

        assert.strictEqual(after.exitCode, 0);
        assert.include(after.output, "current");
        assert.notInclude(after.output, "renamed to");
      }),
    );

    it.effect("preserves a locally edited open-pull-request install", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const projectDir = yield* fs.makeTempDirectoryScoped({ prefix: "dev-kit-skill-rename-" });
        const skillDir = yield* writePreviousPullRequestInstall(projectDir);

        yield* fs.writeFileString(path.join(skillDir, "LOCAL.md"), "local edit\n");
        const update = yield* runDevKit(projectDir, ["skills", "update"]);

        assert.notStrictEqual(update.exitCode, 0);
        assert.include(update.output, "local and upstream changes; renamed to pull-requests");
        assert.isTrue(yield* fs.exists(path.join(skillDir, "LOCAL.md")));
        assert.isFalse(
          yield* fs.exists(path.join(projectDir, ".agents", "skills", "pull-requests")),
        );
      }),
    );

    it.effect("adds and describes pull-requests from the previous name", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const projectDir = yield* fs.makeTempDirectoryScoped({ prefix: "dev-kit-skill-rename-" });
        const info = yield* runDevKit(projectDir, ["skills", "info", "open-pull-request"]);

        assert.strictEqual(info.exitCode, 0);
        assert.include(info.output, "Renamed from: open-pull-request");
        const search = yield* runDevKit(projectDir, ["skills", "search", "open-pull-request"]);

        assert.strictEqual(search.exitCode, 0);
        assert.include(search.output, "pull-requests");
        const add = yield* runDevKit(projectDir, ["skills", "add", "open-pull-request"]);

        assert.strictEqual(add.exitCode, 0);
        assert.include(add.output, "open-pull-request was renamed to pull-requests");
        assert.isTrue(
          yield* fs.exists(
            path.join(projectDir, ".agents", "skills", "pull-requests", "references", "review.md"),
          ),
        );
        assert.isFalse(
          yield* fs.exists(path.join(projectDir, ".agents", "skills", "open-pull-request")),
        );
      }),
    );
  });
});
