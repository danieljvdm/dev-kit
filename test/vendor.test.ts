import { NodeServices } from "@effect/platform-node";
import { assert, describe, layer } from "@effect/vitest";
import { Effect, FileSystem, Path } from "effect";

import { runCommandSuccess, runDevKit } from "./test-platform.ts";

const writeSkill = Effect.fn("writeVendorTestSkill")(function* (
  root: string,
  name: string,
  body: string,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const skillDir = path.join(root, "skills", name);

  yield* fs.makeDirectory(skillDir, { recursive: true });
  yield* fs.writeFileString(
    path.join(skillDir, "SKILL.md"),
    `---\nname: ${name}\ndescription: Test skill ${name}.\ndisable-model-invocation: true\n---\n\n${body}\n`,
  );
});

const commitAll = Effect.fn("commitVendorTestRepository")(function* (
  repository: string,
  message: string,
) {
  yield* runCommandSuccess(repository, "git", ["add", "."]);
  yield* runCommandSuccess(repository, "git", ["commit", "-m", message]);
});

const writeSourceManifest = Effect.fn("writeVendorTestManifest")(function* (
  aggregate: string,
  upstream: string,
  include: ReadonlyArray<string>,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  yield* fs.writeFileString(
    path.join(aggregate, "skill-sources.jsonc"),
    `${JSON.stringify(
      {
        sources: [
          {
            id: "fixture-skills",
            repository: upstream,
            ref: "main",
            skillsPath: "skills",
            include,
            licensePath: "LICENSE",
            stripFrontmatter: ["disable-model-invocation"],
          },
        ],
      },
      null,
      2,
    )}\n`,
  );
});

const createFixture = Effect.fn("createVendorTestFixture")(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const root = yield* fs.makeTempDirectoryScoped({
    prefix: "dev-kit-vendor-test-",
  });
  const upstream = path.join(root, "upstream");
  const aggregate = path.join(root, "aggregate");

  yield* fs.makeDirectory(upstream);
  yield* fs.makeDirectory(aggregate);
  yield* runCommandSuccess(upstream, "git", ["init", "-b", "main"]);
  yield* runCommandSuccess(upstream, "git", ["config", "user.name", "Dev Kit Test"]);
  yield* runCommandSuccess(upstream, "git", ["config", "user.email", "dev-kit@example.test"]);
  yield* writeSkill(upstream, "one", "version one");
  yield* writeSkill(upstream, "two", "second skill");
  yield* fs.writeFileString(path.join(upstream, "LICENSE"), "test license\n");
  yield* commitAll(upstream, "initial");
  yield* writeSourceManifest(aggregate, upstream, ["one"]);

  return { aggregate, root, upstream };
});

describe("approved skill catalog", () => {
  layer(NodeServices.layer)((it) => {
    it.effect("refuses to refresh while another dev-kit operation holds the lock", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const fixture = yield* createFixture();
        const processLock = path.join(fixture.aggregate, ".dev-kit", "apply.lock");
        const ownerPath = path.join(processLock, "owner.json");

        yield* fs.makeDirectory(processLock, { recursive: true });
        yield* fs.writeFileString(ownerPath, '{"token":"other-process"}\n');

        const result = yield* runDevKit(fixture.aggregate, [
          "catalog",
          "refresh",
          "--repo-dir",
          fixture.aggregate,
        ]);

        assert.notStrictEqual(result.exitCode, 0);
        assert.match(result.output, /another dev-kit operation may be active/);
        assert.isFalse(yield* fs.exists(path.join(fixture.aggregate, "skill-sources.lock.json")));
        assert.strictEqual(yield* fs.readFileString(ownerPath), '{"token":"other-process"}\n');
      }),
    );
  });
});
