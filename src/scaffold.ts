import { Effect, FileSystem, Path, Schema } from "effect";

import { observeSymbolicLink } from "./node-symbolic-link.ts";

export class ScaffoldTemplateError extends Schema.TaggedError<ScaffoldTemplateError>()(
  "ScaffoldTemplateError",
  { message: Schema.String },
) {}

export type ScaffoldPlan = {
  readonly action: "scaffold" | "unchanged";
  readonly path: string;
  readonly destination: string;
  readonly content?: string;
};

export const replaceUniqueTemplateMarker = (
  template: string,
  marker: string,
  replacement: string,
): string => {
  const parts = template.split(marker);

  if (parts.length !== 2) {
    throw new Error(`expected exactly one generated template marker: ${marker}`);
  }

  return `${parts[0]}${replacement}${parts[1]}`;
};

export const readScaffoldTemplate = Effect.fn("readScaffoldTemplate")(function* (
  packageRoot: string,
  templatePath: string,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const absolute = path.join(packageRoot, templatePath);

  if (!(yield* fs.exists(absolute))) {
    return yield* ScaffoldTemplateError.make({
      message: `dev-kit scaffold template is missing: ${templatePath}`,
    });
  }

  return yield* fs.readFileString(absolute);
});

// Scaffolds are created once and repository-owned afterwards: an existing
// destination is never read, compared, updated, or removed, and `content` is
// only computed (and validated) when the file is actually being created.
export const planScaffold = Effect.fn("planScaffold")(function* <E, R>(options: {
  readonly projectDir: string;
  readonly path: string;
  readonly content: Effect.Effect<string, E, R>;
}) {
  const path = yield* Path.Path;
  const destination = path.join(options.projectDir, ...options.path.split("/"));
  const observed = yield* observeSymbolicLink(destination);

  if (observed.kind !== "missing") {
    return { action: "unchanged", path: options.path, destination } satisfies ScaffoldPlan;
  }

  return {
    action: "scaffold",
    path: options.path,
    destination,
    content: yield* options.content,
  } satisfies ScaffoldPlan;
});

export const applyScaffoldPlan = Effect.fn("applyScaffoldPlan")(function* (plan: ScaffoldPlan) {
  if (plan.action !== "scaffold" || plan.content === undefined) return;
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  yield* fs.makeDirectory(path.dirname(plan.destination), { recursive: true });
  yield* fs.writeFileString(plan.destination, plan.content);
});
