import { Config, Effect, FileSystem, Path, Schema, type PlatformError } from "effect";

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
