import { Schema } from "effect";

import { DigestSchema } from "./path-digest.ts";

const EnabledSetupSchema = Schema.Struct({
  enabled: Schema.optional(Schema.Boolean),
});

export const LegacyDevKitManifestSchema = Schema.Struct({
  setup: Schema.optional(
    Schema.Struct({
      effectSource: Schema.optional(EnabledSetupSchema),
      effectTsgo: Schema.optional(EnabledSetupSchema),
      vitePlus: Schema.optional(
        Schema.Struct({
          hooks: Schema.optional(EnabledSetupSchema),
        }),
      ),
    }),
  ),
});

export type LegacyDevKitManifest = typeof LegacyDevKitManifestSchema.Type;

export const legacySetupFlags = (manifest: LegacyDevKitManifest) => ({
  effectSource: manifest.setup?.effectSource?.enabled ?? false,
  effectTsgo: manifest.setup?.effectTsgo?.enabled ?? false,
  vitePlusHooks: manifest.setup?.vitePlus?.hooks?.enabled ?? false,
});

const LegacyCatalogProvenanceSchema = Schema.Union([
  Schema.Struct({
    source: Schema.String,
    repository: Schema.String,
    resolved: Schema.String,
  }),
  Schema.Struct({
    package: Schema.String,
    version: Schema.String,
    skill: Schema.String,
    digest: DigestSchema,
  }),
]);

export const LegacyManagedSkillOutputSchema = Schema.Struct({
  resourceId: Schema.String,
  path: Schema.String,
  skill: Schema.String,
  target: Schema.Literals(["agents", "claude", "opencode"]),
  mode: Schema.Literals(["copy", "symlink"]),
  kind: Schema.Literals(["directory", "symlink"]),
  digest: DigestSchema,
  catalog: Schema.optional(LegacyCatalogProvenanceSchema),
});

export type LegacyManagedSkillOutput = typeof LegacyManagedSkillOutputSchema.Type;

const LegacyOtherOutputSchema = Schema.Struct({
  resourceId: Schema.String,
  path: Schema.String,
});

export const LegacyDevKitLockSchema = Schema.Struct({
  version: Schema.Literal(1),
  toolVersion: Schema.String,
  outputs: Schema.Array(Schema.Union([LegacyManagedSkillOutputSchema, LegacyOtherOutputSchema])),
});
