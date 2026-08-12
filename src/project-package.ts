import { Effect, FileSystem, Option, Path, Schema } from "effect";

export class ProjectPackageError extends Schema.TaggedError<ProjectPackageError>()(
  "ProjectPackageError",
  { message: Schema.String },
) {}

const ProjectPackageSchema = Schema.fromJsonString(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    packageManager: Schema.optional(Schema.String),
    scripts: Schema.optional(Schema.Record(Schema.String, Schema.String)),
    dependencies: Schema.optional(Schema.Record(Schema.String, Schema.String)),
    devDependencies: Schema.optional(Schema.Record(Schema.String, Schema.String)),
    optionalDependencies: Schema.optional(Schema.Record(Schema.String, Schema.String)),
    peerDependencies: Schema.optional(Schema.Record(Schema.String, Schema.String)),
    workspaces: Schema.optional(Schema.Unknown),
  }),
);

export const readProjectPackage = Effect.fn("readProjectPackage")(function* (projectDir: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const manifestPath = path.join(projectDir, "package.json");

  if (!(yield* fs.exists(manifestPath))) {
    return yield* ProjectPackageError.make({
      message: `package.json not found: ${manifestPath}`,
    });
  }
  const manifest = yield* fs.readFileString(manifestPath).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(ProjectPackageSchema)),
    Effect.mapError(() =>
      ProjectPackageError.make({
        message: `invalid project package.json: ${manifestPath}`,
      }),
    ),
  );

  return manifest;
});

export const PACKAGE_MANAGER_COMMANDS = {
  bun: { install: "bun install", label: "Bun" },
  npm: { install: "npm install", label: "npm" },
  pnpm: { install: "pnpm install", label: "pnpm" },
  yarn: { install: "yarn install", label: "Yarn" },
} as const;

const PackageManagerNameSchema = Schema.Literals(["bun", "npm", "pnpm", "yarn"]);

export type PackageManagerName = typeof PackageManagerNameSchema.Type;

const decodePackageManagerName = Schema.decodeUnknownOption(PackageManagerNameSchema);

const packageManagerName = (declaration: string | undefined): PackageManagerName | undefined => {
  const name = declaration?.split("@", 1)[0];

  return name === undefined ? undefined : Option.getOrUndefined(decodePackageManagerName(name));
};

export const detectPackageManager = Effect.fn("detectPackageManager")(function* (
  projectDir: string,
  declaration: string | undefined,
) {
  const declared = packageManagerName(declaration);

  if (declared !== undefined || declaration !== undefined) return declared;
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const lockfiles: ReadonlyArray<readonly [PackageManagerName, ReadonlyArray<string>]> = [
    ["bun", ["bun.lock", "bun.lockb"]],
    ["npm", ["package-lock.json", "npm-shrinkwrap.json"]],
    ["pnpm", ["pnpm-lock.yaml"]],
    ["yarn", ["yarn.lock"]],
  ];
  const detected: Array<PackageManagerName> = [];

  for (const [manager, files] of lockfiles) {
    let found = false;

    for (const file of files) {
      if (yield* fs.exists(path.join(projectDir, file))) {
        found = true;
        break;
      }
    }
    if (found) {
      detected.push(manager);
    }
  }

  return detected.length === 1 ? detected[0] : undefined;
});

const readOptionalProjectPackage = Effect.fn("readOptionalProjectPackage")(function* (
  packageDir: string,
) {
  return yield* readProjectPackage(packageDir).pipe(
    Effect.catchTag("ProjectPackageError", (error) =>
      error.message.startsWith("package.json not found:") ? Effect.void : Effect.fail(error),
    ),
  );
});

const manifestDependencyNames = (
  manifest: (typeof ProjectPackageSchema)["Type"] | undefined | void,
): ReadonlyArray<string> =>
  manifest === undefined
    ? []
    : [
        ...Object.keys(manifest.dependencies ?? {}),
        ...Object.keys(manifest.devDependencies ?? {}),
        ...Object.keys(manifest.optionalDependencies ?? {}),
        ...Object.keys(manifest.peerDependencies ?? {}),
      ];

export const readDirectDependencyNames = Effect.fn("readDirectDependencyNames")(function* (
  projectDir: string,
) {
  const manifest = yield* readOptionalProjectPackage(projectDir);

  return [...new Set(manifestDependencyNames(manifest))].sort();
});

const WorkspacePatternsSchema = Schema.Union([
  Schema.Array(Schema.String),
  Schema.Struct({ packages: Schema.Array(Schema.String) }),
]);
// `workspaces` is declared `Schema.Unknown` in the project manifest schema, so
// this is a genuinely untyped boundary.
const decodeWorkspacePatterns = Schema.decodeUnknownOption(WorkspacePatternsSchema);

const workspacePatterns = (
  workspaces: typeof WorkspacePatternsSchema.Type,
): ReadonlyArray<string> => ("packages" in workspaces ? workspaces.packages : workspaces);

/**
 * Direct dependency names of the project package plus every workspace member
 * package. Only literal workspace paths and single trailing-star globs
 * (`apps/*`) are expanded; other patterns are skipped.
 */
export const readWorkspaceDependencyNames = Effect.fn("readWorkspaceDependencyNames")(function* (
  projectDir: string,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const manifest = yield* readOptionalProjectPackage(projectDir);
  const names = new Set(manifestDependencyNames(manifest));
  const decodedWorkspaces = decodeWorkspacePatterns(manifest?.workspaces);
  const patterns = Option.isSome(decodedWorkspaces)
    ? workspacePatterns(decodedWorkspaces.value)
    : [];

  for (const pattern of patterns) {
    if (pattern.startsWith("!")) continue;
    const star = pattern.indexOf("*");
    let memberDirs: ReadonlyArray<string> = [];

    if (star === -1) {
      memberDirs = [pattern];
    } else if (pattern.endsWith("/*") && star === pattern.length - 1) {
      const parent = path.join(projectDir, pattern.slice(0, -2));

      if (yield* fs.exists(parent)) {
        memberDirs = (yield* fs.readDirectory(parent)).map((name) =>
          path.join(pattern.slice(0, -2), name),
        );
      }
    }
    for (const memberDir of memberDirs) {
      const member = yield* readOptionalProjectPackage(path.join(projectDir, memberDir));

      for (const name of manifestDependencyNames(member)) names.add(name);
    }
  }

  return [...names].sort();
});
