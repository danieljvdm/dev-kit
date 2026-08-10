import { Effect, FileSystem, Path, Schema } from "effect";

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

export type PackageManagerName = keyof typeof PACKAGE_MANAGER_COMMANDS;

const packageManagerName = (declaration: string | undefined): PackageManagerName | undefined => {
  const name = declaration?.split("@", 1)[0];

  return name !== undefined && name in PACKAGE_MANAGER_COMMANDS
    ? (name as PackageManagerName)
    : undefined;
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

export const readDirectDependencyNames = Effect.fn("readDirectDependencyNames")(function* (
  projectDir: string,
) {
  const manifest = yield* readProjectPackage(projectDir).pipe(
    Effect.catchTag("ProjectPackageError", (error) =>
      error.message.startsWith("package.json not found:") ? Effect.void : Effect.fail(error),
    ),
  );

  if (manifest === undefined) return [];

  return [
    ...new Set([
      ...Object.keys(manifest.dependencies ?? {}),
      ...Object.keys(manifest.devDependencies ?? {}),
      ...Object.keys(manifest.optionalDependencies ?? {}),
      ...Object.keys(manifest.peerDependencies ?? {}),
    ]),
  ].sort();
});
