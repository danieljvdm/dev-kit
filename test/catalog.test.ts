import { NodeServices } from "@effect/platform-node";
import { assert, describe, layer } from "@effect/vitest";
import { ConfigProvider, Effect, FileSystem, Path } from "effect";

import { loadSkillCatalog, resolveSkillSources } from "../src/catalog.ts";
import { observePath } from "../src/path-digest.ts";
import { runCommandSuccess } from "./test-platform.ts";

const createRemoteCatalogFixture = Effect.fn("createRemoteCatalogFixture")(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const root = yield* fs.makeTempDirectoryScoped({ prefix: "dev-kit-catalog-" });
  const upstream = path.join(root, "upstream");
  const packageRoot = path.join(root, "package");
  const cacheDir = path.join(root, "cache");

  yield* fs.makeDirectory(path.join(upstream, "skills", "remote-skill"), { recursive: true });
  yield* fs.makeDirectory(path.join(packageRoot, "skills"), { recursive: true });
  const upstreamDocument =
    "---\nname: remote-skill\ndescription: A remote test skill.\ndisable-model-invocation: true\n---\n\nHello.\n";

  yield* fs.writeFileString(
    path.join(upstream, "skills", "remote-skill", "SKILL.md"),
    upstreamDocument,
  );
  yield* runCommandSuccess(upstream, "git", ["init", "-b", "main"]);
  yield* runCommandSuccess(upstream, "git", ["config", "user.name", "Test"]);
  yield* runCommandSuccess(upstream, "git", ["config", "user.email", "test@example.test"]);
  yield* runCommandSuccess(upstream, "git", ["add", "."]);
  yield* runCommandSuccess(upstream, "git", ["commit", "-m", "initial"]);
  const resolved = (yield* runCommandSuccess(upstream, "git", ["rev-parse", "HEAD"])).trim();
  const approved = path.join(root, "approved", "remote-skill");

  yield* fs.copy(path.join(upstream, "skills", "remote-skill"), approved, {
    overwrite: true,
  });
  yield* fs.writeFileString(
    path.join(approved, "SKILL.md"),
    upstreamDocument.replace("disable-model-invocation: true\n", ""),
  );
  const approvedObservation = yield* observePath(approved);

  if (approvedObservation.kind !== "directory") {
    return yield* Effect.die(new Error("approved fixture skill is not a directory"));
  }
  yield* fs.writeFileString(
    path.join(packageRoot, "skill-sources.lock.json"),
    `${JSON.stringify(
      {
        version: 1,
        sources: [
          {
            id: "test-source",
            repository: upstream,
            ref: "main",
            resolved,
            skillsPath: "skills",
            include: ["remote-skill"],
            skills: ["remote-skill"],
            descriptions: { "remote-skill": "A remote test skill." },
            digests: { "remote-skill": approvedObservation.digest },
            stripFrontmatter: ["disable-model-invocation"],
          },
        ],
      },
      null,
      2,
    )}\n`,
  );

  const createProject = Effect.fn("createRemoteCatalogProject")(function* (name: string) {
    const projectDir = path.join(root, name);

    yield* fs.makeDirectory(projectDir, { recursive: true });

    return projectDir;
  });

  return { cacheDir, createProject, packageRoot, resolved, root, upstream };
});

type RemoteCatalogFixture = Effect.Success<ReturnType<typeof createRemoteCatalogFixture>>;

const remoteCatalogTest = <A, E, R>(
  body: (fixture: RemoteCatalogFixture) => Effect.Effect<A, E, R>,
) =>
  Effect.gen(function* () {
    const fixture = yield* createRemoteCatalogFixture();

    yield* body(fixture).pipe(
      Effect.provideService(
        ConfigProvider.ConfigProvider,
        ConfigProvider.fromEnv({ env: { DEV_KIT_CACHE_DIR: fixture.cacheDir } }),
      ),
    );
  });

describe("remote catalog resolution", () => {
  layer(NodeServices.layer)((it) => {
    it.effect("materializes an exact approved commit in the machine-global cache", () =>
      remoteCatalogTest((fixture) =>
        Effect.gen(function* () {
          const fs = yield* FileSystem.FileSystem;
          const path = yield* Path.Path;
          const projectDir = yield* fixture.createProject("project");
          const catalog = yield* loadSkillCatalog(fixture.packageRoot, projectDir);

          assert.deepEqual(catalog.families["test-source"], ["remote-skill"]);
          const sources = yield* resolveSkillSources(fixture.packageRoot, projectDir, catalog, [
            "remote-skill",
          ]);
          const materialized = sources.get("remote-skill");

          if (materialized === undefined) assert.fail("remote-skill was not materialized");
          const document = yield* fs.readFileString(path.join(materialized.path, "SKILL.md"));

          assert.include(document, "Hello.");
          assert.notInclude(document, "disable-model-invocation");
          assert.strictEqual(
            materialized.path,
            path.join(
              fixture.cacheDir,
              "catalog",
              "test-source",
              fixture.resolved,
              "skills",
              "remote-skill",
            ),
          );
          if (materialized.catalog === undefined || !("resolved" in materialized.catalog)) {
            assert.fail("remote catalog provenance was not recorded");
          }
          assert.strictEqual(materialized.catalog.resolved, fixture.resolved);
          assert.isFalse(
            yield* fs.exists(path.join(fixture.packageRoot, "skills", "remote-skill")),
          );
          assert.isFalse(yield* fs.exists(path.join(projectDir, ".dev-kit")));

          const cachedDocument = path.join(materialized.path, "SKILL.md");
          const cachedInfo = yield* fs.stat(cachedDocument);

          yield* fs.chmod(cachedDocument, cachedInfo.mode ^ 0o044);
          const permissionsAdjusted = yield* resolveSkillSources(
            fixture.packageRoot,
            projectDir,
            catalog,
            ["remote-skill"],
          );

          assert.isTrue(permissionsAdjusted.has("remote-skill"));

          yield* fs.writeFileString(path.join(materialized.path, "SKILL.md"), "tampered\n");
          const error = yield* Effect.flip(
            resolveSkillSources(fixture.packageRoot, projectDir, catalog, ["remote-skill"]),
          );

          assert.match(error.message, /does not match the approved catalog/);
        }),
      ),
    );

    it.effect("reuses the warm cache across projects and plans without the network", () =>
      remoteCatalogTest((fixture) =>
        Effect.gen(function* () {
          const fs = yield* FileSystem.FileSystem;
          const path = yield* Path.Path;
          const projectA = yield* fixture.createProject("project-a");
          const catalogA = yield* loadSkillCatalog(fixture.packageRoot, projectA);

          assert.isTrue(
            (yield* resolveSkillSources(fixture.packageRoot, projectA, catalogA, [
              "remote-skill",
            ])).has("remote-skill"),
          );
          assert.isTrue(
            yield* fs.exists(
              path.join(fixture.cacheDir, "catalog", "test-source", fixture.resolved, ".ready"),
            ),
          );

          // Any further git operation against the upstream would now fail.
          yield* fs.remove(fixture.upstream, { force: true, recursive: true });

          const projectB = yield* fixture.createProject("project-b");
          const catalogB = yield* loadSkillCatalog(fixture.packageRoot, projectB);
          const applied = yield* resolveSkillSources(fixture.packageRoot, projectB, catalogB, [
            "remote-skill",
          ]);

          assert.isTrue(applied.has("remote-skill"));

          const planned = yield* resolveSkillSources(
            fixture.packageRoot,
            projectB,
            catalogB,
            ["remote-skill"],
            false,
          );

          assert.isTrue(planned.has("remote-skill"));
        }),
      ),
    );

    it.effect("populates the machine-global cache during planning", () =>
      remoteCatalogTest((fixture) =>
        Effect.gen(function* () {
          const fs = yield* FileSystem.FileSystem;
          const path = yield* Path.Path;
          const projectDir = yield* fixture.createProject("project");
          const catalog = yield* loadSkillCatalog(fixture.packageRoot, projectDir);
          const planned = yield* resolveSkillSources(
            fixture.packageRoot,
            projectDir,
            catalog,
            ["remote-skill"],
            false,
          );

          assert.isTrue(planned.has("remote-skill"));
          assert.isTrue(
            yield* fs.exists(
              path.join(fixture.cacheDir, "catalog", "test-source", fixture.resolved, ".ready"),
            ),
          );

          yield* fs.remove(fixture.upstream, { force: true, recursive: true });
          const applied = yield* resolveSkillSources(fixture.packageRoot, projectDir, catalog, [
            "remote-skill",
          ]);

          assert.isTrue(applied.has("remote-skill"));
        }),
      ),
    );

    it.effect("discovers and resolves skills from a direct installed dependency", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const root = yield* fs.makeTempDirectoryScoped({ prefix: "dev-kit-package-catalog-" });
        const packageRoot = path.join(root, "dev-kit-package");
        const projectDir = path.join(root, "project");
        const installed = path.join(projectDir, "node_modules", "@scope", "tools");

        yield* fs.makeDirectory(path.join(packageRoot, "skills"), { recursive: true });
        yield* fs.makeDirectory(path.join(installed, "skills", "package-skill"), {
          recursive: true,
        });
        yield* fs.writeFileString(
          path.join(installed, "package.json"),
          '{"name":"@scope/tools","version":"2.3.4","repository":{"type":"git","url":"https://example.test/tools.git"}}\n',
        );
        yield* fs.writeFileString(
          path.join(projectDir, "package.json"),
          '{"dependencies":{"@scope/tools":"2.3.4"}}\n',
        );
        yield* fs.writeFileString(
          path.join(installed, "skills", "package-skill", "SKILL.md"),
          "---\nname: package-skill\ndescription: Installed package skill.\n---\n\nHello.\n",
        );
        const catalog = yield* loadSkillCatalog(packageRoot, projectDir);

        assert.deepEqual(
          catalog.skills.map((skill) => skill.selector),
          ["@scope/tools#package-skill"],
        );
        assert.deepEqual(
          catalog.skills.map((skill) => skill.name),
          ["scope-tools-package-skill"],
        );
        const resolved = yield* resolveSkillSources(packageRoot, projectDir, catalog, [
          "@scope/tools#package-skill",
        ]);
        const skill = resolved.get("@scope/tools#package-skill");

        if (skill === undefined) assert.fail("package skill was not resolved");
        assert.strictEqual(
          skill.path,
          path.join(
            projectDir,
            ".dev-kit",
            "cache",
            "package-skills",
            "scope-tools-package-skill",
            "skill",
          ),
        );
        assert.strictEqual(
          yield* fs.readFileString(path.join(skill.path, "SKILL.md")),
          "---\nname: scope-tools-package-skill\ndescription: Installed package skill.\n---\n\nHello.\n",
        );
        assert.strictEqual(skill.linkPath, path.join(installed, "skills", "package-skill"));
        if (skill.catalog === undefined || !("package" in skill.catalog)) {
          assert.fail("package catalog provenance was not recorded");
        }
        assert.strictEqual(skill.catalog.package, "@scope/tools");
        assert.strictEqual(skill.catalog.version, "2.3.4");
        assert.strictEqual(skill.catalog.skill, "package-skill");
        assert.match(skill.catalog.digest, /^sha256:/);

        yield* fs.writeFileString(
          path.join(installed, "skills", "package-skill", "SKILL.md"),
          "---\nname: package-skill\ndescription: Installed package skill.\n---\n\nChanged.\n",
        );
        const restaged = (yield* resolveSkillSources(packageRoot, projectDir, catalog, [
          "@scope/tools#package-skill",
        ])).get("@scope/tools#package-skill");

        if (restaged?.catalog === undefined || !("package" in restaged.catalog)) {
          assert.fail("package catalog provenance was not recorded");
        }
        assert.notStrictEqual(restaged.catalog.digest, skill.catalog.digest);
        assert.strictEqual(
          yield* fs.readFileString(path.join(restaged.path, "SKILL.md")),
          "---\nname: scope-tools-package-skill\ndescription: Installed package skill.\n---\n\nChanged.\n",
        );
      }),
    );
  });
});
