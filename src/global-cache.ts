import {
  Config,
  DateTime,
  Effect,
  FileSystem,
  Option,
  Path,
  Schema,
  Stream,
  type PlatformError,
} from "effect";
import { ChildProcess } from "effect/unstable/process";

import { printStatus } from "./cli-ui.ts";

export class GlobalCacheError extends Schema.TaggedError<GlobalCacheError>()("GlobalCacheError", {
  message: Schema.String,
}) {}

/**
 * Resolves the machine-global dev-kit cache directory. Entries stored here are
 * keyed by immutable identifiers (resolved commit SHAs, repository URLs), so
 * the cache is shared safely across projects and git worktrees. Populating it
 * is not project state: locked verification and dry-run planning may write
 * here without violating their read-only project semantics.
 */
export const resolveGlobalCacheDirectory = Effect.fn("resolveGlobalCacheDirectory")(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const override = yield* Config.string("DEV_KIT_CACHE_DIR").pipe(Config.withDefault(""));

  if (override.length > 0) return path.resolve(override);
  const xdgCacheHome = yield* Config.string("XDG_CACHE_HOME").pipe(Config.withDefault(""));

  if (xdgCacheHome.length > 0 && path.isAbsolute(xdgCacheHome)) {
    return path.join(xdgCacheHome, "dev-kit");
  }
  const home = yield* Config.string("HOME").pipe(
    Config.orElse(() => Config.string("USERPROFILE")),
    Config.withDefault(""),
  );

  if (home.length === 0 || !path.isAbsolute(home)) {
    return yield* GlobalCacheError.make({
      message: "cannot locate the dev-kit cache; set DEV_KIT_CACHE_DIR, XDG_CACHE_HOME, or HOME",
    });
  }
  // The user cache convention differs per platform; an existing Library/Caches
  // identifies macOS without reaching for Node platform APIs.
  const macCaches = path.join(home, "Library", "Caches");

  return (yield* fs.exists(macCaches))
    ? path.join(macCaches, "dev-kit")
    : path.join(home, ".cache", "dev-kit");
});

/**
 * Publishes a fully staged cache entry at its immutable destination. The
 * staged directory must live on the same filesystem so the rename is atomic;
 * when a concurrent writer publishes the destination first, its entry wins and
 * the staged copy is discarded.
 */
export const commitCacheDirectory = Effect.fn("commitCacheDirectory")(function* (
  staged: string,
  destination: string,
  isPopulated: Effect.Effect<boolean, PlatformError.PlatformError>,
) {
  const fs = yield* FileSystem.FileSystem;

  if ((yield* fs.exists(destination)) && !(yield* isPopulated)) {
    yield* fs.remove(destination, { force: true, recursive: true });
  }

  yield* fs.rename(staged, destination).pipe(
    Effect.catch((error) =>
      Effect.gen(function* () {
        if (!(yield* isPopulated)) return yield* error;

        return yield* fs.remove(staged, { force: true, recursive: true });
      }),
    ),
  );
});

export const CACHE_PRUNE_AGE_DAYS = 30;

const DAY_MILLIS = 24 * 60 * 60 * 1000;
const LAST_USED_STAMP = ".last-used";
const TAG_USAGE_DIRECTORY = "dev-kit-tag-usage";

const runGit = Effect.fn("runGlobalCacheGit")(function* (cwd: string, args: ReadonlyArray<string>) {
  const child = yield* ChildProcess.make("git", args, {
    cwd,
    stderr: "pipe",
    stdout: "pipe",
  });
  const [output, exitCode] = yield* Effect.all([
    Stream.mkString(Stream.decodeText(child.all)),
    child.exitCode,
  ]);

  if (exitCode !== 0) {
    return yield* GlobalCacheError.make({
      message: `git ${args.join(" ")} failed: ${output.trim()}`,
    });
  }

  return output.trim();
});

const readMtimeMillis = Effect.fn("readCacheMtimeMillis")(function* (target: string) {
  const fs = yield* FileSystem.FileSystem;
  const info = yield* fs.stat(target).pipe(Effect.catch(() => Effect.void));

  if (info === undefined) return undefined;

  return Option.match(info.mtime, {
    onNone: () => undefined,
    onSome: (mtime) => mtime.getTime(),
  });
});

const listDirectory = Effect.fn("listCacheDirectory")(function* (directory: string) {
  const fs = yield* FileSystem.FileSystem;

  return (yield* fs.exists(directory)) ? yield* fs.readDirectory(directory) : [];
});

/** Best-effort recency stamp for a catalog cache entry; read by pruning. */
export const stampCacheEntryUsage = Effect.fn("stampCacheEntryUsage")(function* (entryDir: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  yield* fs.writeFileString(path.join(entryDir, LAST_USED_STAMP), "").pipe(Effect.ignore);
});

/**
 * Best-effort recency stamp for one tag in a shared repository. Written before
 * the tag is fetched so pruning never mistakes an in-flight fetch for an
 * unused tag.
 */
export const stampTagUsage = Effect.fn("stampTagUsage")(function* (
  repositoryDir: string,
  tag: string,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const usageDir = path.join(repositoryDir, TAG_USAGE_DIRECTORY);

  yield* fs
    .makeDirectory(usageDir, { recursive: true })
    .pipe(
      Effect.andThen(fs.writeFileString(path.join(usageDir, encodeURIComponent(tag)), "")),
      Effect.ignore,
    );
});

export type GlobalCachePruneOptions = {
  readonly all?: boolean;
  readonly maxAgeDays?: number;
};

export type GlobalCachePruneSummary = {
  readonly removedEntries: number;
  readonly removedRepositories: number;
  readonly removedTags: number;
};

/**
 * Evicts cache content that no project on the machine has used recently.
 * Everything here is regenerable, so eviction is always safe: a wrongly
 * removed entry is simply fetched again on the next apply.
 */
export const pruneGlobalCache = Effect.fn("pruneGlobalCache")(function* (
  options: GlobalCachePruneOptions = {},
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const cacheDir = yield* resolveGlobalCacheDirectory();
  const catalogDir = path.join(cacheDir, "catalog");
  const repositoriesDir = path.join(cacheDir, "effect-source");
  let removedEntries = 0;
  let removedRepositories = 0;
  let removedTags = 0;

  if (options.all === true) {
    for (const id of yield* listDirectory(catalogDir)) {
      removedEntries += (yield* listDirectory(path.join(catalogDir, id))).length;
    }
    removedRepositories = (yield* listDirectory(repositoriesDir)).length;
    yield* fs.remove(catalogDir, { force: true, recursive: true });
    yield* fs.remove(repositoriesDir, { force: true, recursive: true });

    return { removedEntries, removedRepositories, removedTags } satisfies GlobalCachePruneSummary;
  }
  const now = DateTime.toEpochMillis(yield* DateTime.now);
  const cutoff = now - (options.maxAgeDays ?? CACHE_PRUNE_AGE_DAYS) * DAY_MILLIS;

  // Catalog entries and orphaned staging directories age out individually.
  for (const id of yield* listDirectory(catalogDir)) {
    const idDir = path.join(catalogDir, id);

    for (const entry of yield* listDirectory(idDir)) {
      const entryDir = path.join(idDir, entry);
      const lastUsed =
        (yield* readMtimeMillis(path.join(entryDir, LAST_USED_STAMP))) ??
        (yield* readMtimeMillis(path.join(entryDir, ".ready"))) ??
        (yield* readMtimeMillis(entryDir));

      if (lastUsed !== undefined && lastUsed < cutoff) {
        yield* fs.remove(entryDir, { force: true, recursive: true }).pipe(Effect.ignore);
        removedEntries += 1;
      }
    }
  }
  // Shared repositories drop tags individually; a repository that no longer
  // holds any tag is removed whole.
  for (const name of yield* listDirectory(repositoriesDir)) {
    const repositoryDir = path.join(repositoriesDir, name);

    if (!(yield* fs.exists(path.join(repositoryDir, "HEAD")))) {
      const mtime = yield* readMtimeMillis(repositoryDir);

      if (mtime !== undefined && mtime < cutoff) {
        yield* fs.remove(repositoryDir, { force: true, recursive: true }).pipe(Effect.ignore);
        removedRepositories += 1;
      }
      continue;
    }
    const listed = yield* runGit(repositoryDir, ["tag", "--list"]).pipe(
      Effect.catchTag("GlobalCacheError", () => Effect.void),
    );

    if (listed === undefined) {
      // Unreadable repository: age it out by initialization time.
      if (((yield* readMtimeMillis(path.join(repositoryDir, "HEAD"))) ?? 0) < cutoff) {
        yield* fs.remove(repositoryDir, { force: true, recursive: true }).pipe(Effect.ignore);
        removedRepositories += 1;
      }
      continue;
    }
    const tags = listed.split("\n").filter((tag) => tag.length > 0);
    let kept = 0;
    let deleted = 0;

    for (const tag of tags) {
      const stamp = path.join(repositoryDir, TAG_USAGE_DIRECTORY, encodeURIComponent(tag));

      if (((yield* readMtimeMillis(stamp)) ?? 0) < cutoff) {
        yield* runGit(repositoryDir, ["update-ref", "-d", `refs/tags/${tag}`]).pipe(Effect.ignore);
        yield* fs.remove(stamp, { force: true }).pipe(Effect.ignore);
        removedTags += 1;
        deleted += 1;
      } else {
        kept += 1;
      }
    }
    if (kept === 0) {
      if (
        deleted > 0 ||
        ((yield* readMtimeMillis(path.join(repositoryDir, "HEAD"))) ?? 0) < cutoff
      ) {
        yield* fs.remove(repositoryDir, { force: true, recursive: true }).pipe(Effect.ignore);
        removedRepositories += 1;
      }
    } else if (deleted > 0) {
      yield* runGit(repositoryDir, ["gc", "--prune=now", "--quiet"]).pipe(Effect.ignore);
    }
  }

  return { removedEntries, removedRepositories, removedTags } satisfies GlobalCachePruneSummary;
});

/**
 * Opportunistic prune for the apply lifecycle: runs the age-based sweep at
 * most once a day so routine applies stay fast.
 */
export const maybePruneGlobalCache = Effect.fn("maybePruneGlobalCache")(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const cacheDir = yield* resolveGlobalCacheDirectory();
  const marker = path.join(cacheDir, ".last-pruned");
  const lastPruned = yield* readMtimeMillis(marker);
  const now = DateTime.toEpochMillis(yield* DateTime.now);

  if (lastPruned !== undefined && now - lastPruned < DAY_MILLIS) return;
  yield* fs.makeDirectory(cacheDir, { recursive: true });
  yield* fs.writeFileString(marker, "");
  yield* pruneGlobalCache();
});

export const runCachePrune = Effect.fn("runCachePrune")(function* (
  options: GlobalCachePruneOptions = {},
) {
  const cacheDir = yield* resolveGlobalCacheDirectory();
  const summary = yield* pruneGlobalCache(options);

  yield* printStatus(
    "success",
    options.all === true ? "Cache cleared" : "Cache pruned",
    `removed ${summary.removedEntries} catalog entries, ${summary.removedTags} tags, ` +
      `${summary.removedRepositories} repositories from ${cacheDir}`,
  );
});
