import { NodeServices } from "@effect/platform-node";
import { assert, describe, layer } from "@effect/vitest";
import { ConfigProvider, Effect, FileSystem, Path } from "effect";
import { TestClock } from "effect/testing";

import { maybePruneGlobalCache, pruneGlobalCache } from "../src/global-cache.ts";
import { runCommandSuccess, runDevKit } from "./test-platform.ts";

const DAY_MILLIS = 24 * 60 * 60 * 1000;

// it.effect freezes the test clock at epoch zero; age-based pruning compares
// real filesystem mtimes against the clock, so move it to the real now.
const useRealNow = () => TestClock.setTime(Date.now());

const withCacheDirectory = (cacheDir: string) =>
  Effect.provideService(
    ConfigProvider.ConfigProvider,
    ConfigProvider.fromEnv({ env: { DEV_KIT_CACHE_DIR: cacheDir } }),
  );

const ageToDays = Effect.fn("ageTestPathToDays")(function* (target: string, days: number) {
  const fs = yield* FileSystem.FileSystem;
  const stamp = new Date(Date.now() - days * DAY_MILLIS);

  yield* fs.utimes(target, stamp, stamp);
});

const writeCatalogEntry = Effect.fn("writeTestCatalogEntry")(function* (
  cacheDir: string,
  source: string,
  resolved: string,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const entryDir = path.join(cacheDir, "catalog", source, resolved);

  yield* fs.makeDirectory(path.join(entryDir, "skills", "some-skill"), { recursive: true });
  yield* fs.writeFileString(path.join(entryDir, ".ready"), `${resolved}\n`);
  yield* fs.writeFileString(path.join(entryDir, ".last-used"), "");

  return entryDir;
});

const createTaggedRepository = Effect.fn("createTestTaggedRepository")(function* (
  root: string,
  tags: ReadonlyArray<string>,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const upstream = path.join(root, "tag-upstream");

  yield* fs.makeDirectory(upstream, { recursive: true });
  yield* runCommandSuccess(upstream, "git", ["init", "-b", "main"]);
  yield* runCommandSuccess(upstream, "git", ["config", "user.name", "Test"]);
  yield* runCommandSuccess(upstream, "git", ["config", "user.email", "test@example.test"]);
  for (const [index, tag] of tags.entries()) {
    yield* fs.writeFileString(path.join(upstream, "source.txt"), `version ${index}\n`);
    yield* runCommandSuccess(upstream, "git", ["add", "."]);
    yield* runCommandSuccess(upstream, "git", ["commit", "-m", `version ${index}`]);
    yield* runCommandSuccess(upstream, "git", ["tag", tag]);
  }

  return upstream;
});

const writeSharedRepository = Effect.fn("writeTestSharedRepository")(function* (
  cacheDir: string,
  upstream: string,
  tags: ReadonlyArray<string>,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const repositoryDir = path.join(cacheDir, "effect-source", "repository");

  yield* fs.makeDirectory(path.dirname(repositoryDir), { recursive: true });
  yield* runCommandSuccess(path.dirname(repositoryDir), "git", [
    "init",
    "--quiet",
    "--bare",
    repositoryDir,
  ]);
  yield* fs.makeDirectory(path.join(repositoryDir, "dev-kit-tag-usage"), { recursive: true });
  for (const tag of tags) {
    yield* runCommandSuccess(repositoryDir, "git", [
      "fetch",
      "--depth",
      "1",
      "--quiet",
      upstream,
      `refs/tags/${tag}:refs/tags/${tag}`,
    ]);
    yield* fs.writeFileString(
      path.join(repositoryDir, "dev-kit-tag-usage", encodeURIComponent(tag)),
      "",
    );
  }

  return repositoryDir;
});

const listTags = Effect.fn("listTestRepositoryTags")(function* (repositoryDir: string) {
  return (yield* runCommandSuccess(repositoryDir, "git", ["tag", "--list"]))
    .split("\n")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
});

describe("global cache pruning", () => {
  layer(NodeServices.layer)((it) => {
    it.effect("evicts stale catalog entries and keeps fresh ones", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const root = yield* fs.makeTempDirectoryScoped({ prefix: "dev-kit-cache-prune-" });
        const cacheDir = path.join(root, "cache");

        yield* useRealNow();
        const stale = yield* writeCatalogEntry(cacheDir, "test-source", "aaa");
        const fresh = yield* writeCatalogEntry(cacheDir, "test-source", "bbb");
        const orphanedStage = path.join(cacheDir, "catalog", "test-source", ".stage-orphan");

        yield* fs.makeDirectory(orphanedStage, { recursive: true });
        yield* ageToDays(path.join(stale, ".last-used"), 60);
        yield* ageToDays(orphanedStage, 60);

        const summary = yield* pruneGlobalCache().pipe(withCacheDirectory(cacheDir));

        assert.strictEqual(summary.removedEntries, 2);
        assert.isFalse(yield* fs.exists(stale));
        assert.isFalse(yield* fs.exists(orphanedStage));
        assert.isTrue(yield* fs.exists(path.join(fresh, ".ready")));
      }),
    );

    it.effect("evicts unused tags, then whole repositories once nothing remains", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const root = yield* fs.makeTempDirectoryScoped({ prefix: "dev-kit-cache-prune-" });
        const cacheDir = path.join(root, "cache");

        yield* useRealNow();
        const upstream = yield* createTaggedRepository(root, [
          "effect@1.0.0",
          "effect@2.0.0",
          "effect@3.0.0",
        ]);
        const repositoryDir = yield* writeSharedRepository(cacheDir, upstream, [
          "effect@1.0.0",
          "effect@2.0.0",
          "effect@3.0.0",
        ]);
        const usageDir = path.join(repositoryDir, "dev-kit-tag-usage");

        yield* ageToDays(path.join(usageDir, encodeURIComponent("effect@1.0.0")), 60);
        // A tag without any usage stamp counts as unused.
        yield* fs.remove(path.join(usageDir, encodeURIComponent("effect@3.0.0")));

        const summary = yield* pruneGlobalCache().pipe(withCacheDirectory(cacheDir));

        assert.strictEqual(summary.removedTags, 2);
        assert.strictEqual(summary.removedRepositories, 0);
        assert.deepEqual(yield* listTags(repositoryDir), ["effect@2.0.0"]);

        yield* ageToDays(path.join(usageDir, encodeURIComponent("effect@2.0.0")), 60);
        const emptied = yield* pruneGlobalCache().pipe(withCacheDirectory(cacheDir));

        assert.strictEqual(emptied.removedTags, 1);
        assert.strictEqual(emptied.removedRepositories, 1);
        assert.isFalse(yield* fs.exists(repositoryDir));
      }),
    );

    it.effect("prunes at most daily from the apply lifecycle", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const root = yield* fs.makeTempDirectoryScoped({ prefix: "dev-kit-cache-prune-" });
        const cacheDir = path.join(root, "cache");

        yield* useRealNow();
        const stale = yield* writeCatalogEntry(cacheDir, "test-source", "aaa");

        yield* ageToDays(path.join(stale, ".last-used"), 60);
        yield* maybePruneGlobalCache().pipe(withCacheDirectory(cacheDir));

        assert.isFalse(yield* fs.exists(stale));
        assert.isTrue(yield* fs.exists(path.join(cacheDir, ".last-pruned")));

        const skipped = yield* writeCatalogEntry(cacheDir, "test-source", "bbb");

        yield* ageToDays(path.join(skipped, ".last-used"), 60);
        yield* maybePruneGlobalCache().pipe(withCacheDirectory(cacheDir));

        assert.isTrue(yield* fs.exists(skipped));
      }),
    );

    it.effect("clears the whole cache with --all through the CLI", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const root = yield* fs.makeTempDirectoryScoped({ prefix: "dev-kit-cache-prune-" });
        const cacheDir = path.join(root, "cache");
        const entry = yield* writeCatalogEntry(cacheDir, "test-source", "aaa");
        const upstream = yield* createTaggedRepository(root, ["effect@1.0.0"]);
        const repositoryDir = yield* writeSharedRepository(cacheDir, upstream, ["effect@1.0.0"]);

        const result = yield* runDevKit(root, ["cache", "prune", "--all"], {
          DEV_KIT_CACHE_DIR: cacheDir,
        });

        assert.strictEqual(result.exitCode, 0, result.output);
        assert.match(result.output, /Cache cleared/);
        assert.match(result.output, /1 catalog entries, 0 tags, 1 repositories/);
        assert.isFalse(yield* fs.exists(entry));
        assert.isFalse(yield* fs.exists(repositoryDir));
        assert.isFalse(yield* fs.exists(path.join(cacheDir, "catalog")));
      }),
    );
  });
});
