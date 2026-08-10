import { NodeServices } from "@effect/platform-node";
import { assert, describe, layer } from "@effect/vitest";
import { Effect, FileSystem, Path } from "effect";

import {
  renderWorktrunkConfigTemplate,
  WORKTRUNK_CONFIG_PATH,
  WORKTRUNK_CONFIG_TEMPLATE,
} from "../src/worktrunk-config.ts";
import { repositoryRoot, runCommandSuccess, runDevKit } from "./test-platform.ts";

const writeFixture = Effect.fn("writeWorktrunkTestFixture")(function* (
  projectDir: string,
  options: {
    readonly config?: boolean;
    readonly vitePlus?: boolean;
    readonly scripts?: Readonly<Record<string, string>>;
  } = {},
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  yield* fs.writeFileString(
    path.join(projectDir, "dev-kit.jsonc"),
    `${JSON.stringify(
      {
        include: [],
        setup: { worktrunk: { config: { enabled: options.config ?? true } } },
        targets: { agents: { enabled: false } },
      },
      null,
      2,
    )}\n`,
  );
  yield* fs.writeFileString(
    path.join(projectDir, "package.json"),
    `${JSON.stringify(
      {
        name: "worktrunk-fixture",
        ...(options.scripts === undefined ? {} : { scripts: options.scripts }),
        devDependencies: (options.vitePlus ?? true) ? { "vite-plus": "0.2.6" } : {},
      },
      null,
      2,
    )}\n`,
  );
});

const createFixture = Effect.fn("createWorktrunkTestFixture")(function* () {
  const fs = yield* FileSystem.FileSystem;
  const projectDir = yield* fs.makeTempDirectoryScoped({ prefix: "dev-kit-worktrunk-test-" });

  yield* runCommandSuccess(projectDir, "git", ["init", "--initial-branch", "main"]);
  yield* writeFixture(projectDir);

  return projectDir;
});

describe("Worktrunk config setup", () => {
  layer(NodeServices.layer)((it) => {
    it.effect("ships template hooks verbatim for Vite+ repositories", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const root = yield* repositoryRoot();
        const template = yield* fs.readFileString(path.join(root, WORKTRUNK_CONFIG_TEMPLATE));

        assert.strictEqual(renderWorktrunkConfigTemplate(template), template);
        assert.include(template, 'pre-merge = "vp run check"');
        assert.include(template, 'copy-ignored = "wt step copy-ignored --require-include"');
        assert.include(template, 'install = "vp install"');
        assert.include(template, "{{ branch | hash_port }}");
        assert.include(template, "wt step tether");
      }),
    );

    it.effect("renders package-script commands for repositories without Vite+", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const root = yield* repositoryRoot();
        const template = yield* fs.readFileString(path.join(root, WORKTRUNK_CONFIG_TEMPLATE));
        const rendered = renderWorktrunkConfigTemplate(template, {
          preMerge: "bun run check",
          install: "pnpm install",
          dev: "bun run dev",
        });

        assert.include(rendered, 'pre-merge = "bun run check"');
        assert.include(rendered, 'install = "pnpm install"');
        assert.include(rendered, "wt step tether -- bun run dev");
        assert.notInclude(rendered, "vp ");
      }),
    );

    it.effect("fails closed when a template marker drifts", () =>
      Effect.sync(() => {
        assert.throws(
          () =>
            renderWorktrunkConfigTemplate('pre-merge = "vp check"\n', {
              preMerge: "bun run check",
              install: "bun install",
              dev: "bun run dev",
            }),
          /expected exactly one generated template marker/,
        );
      }),
    );

    it.effect("scaffolds .config/wt.toml for a Vite+ repository without owning it", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const projectDir = yield* createFixture();
        const applied = yield* runDevKit(projectDir, ["apply", "--project-dir", projectDir]);

        assert.strictEqual(applied.exitCode, 0, applied.output);
        const config = yield* fs.readFileString(path.join(projectDir, WORKTRUNK_CONFIG_PATH));

        assert.include(config, 'pre-merge = "vp run check"');
        assert.include(config, 'install = "vp install"');
        const lock = JSON.parse(
          yield* fs.readFileString(path.join(projectDir, "dev-kit.lock.json")),
        );

        assert.deepEqual(lock.outputs, []);
      }),
    );

    it.effect("never rewrites an existing repository-owned config", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const projectDir = yield* createFixture();
        const destination = path.join(projectDir, WORKTRUNK_CONFIG_PATH);
        const customConfig = 'pre-merge = "vp run check && vp run e2e"\n';

        yield* fs.makeDirectory(path.dirname(destination), { recursive: true });
        yield* fs.writeFileString(destination, customConfig);
        const applied = yield* runDevKit(projectDir, ["apply", "--project-dir", projectDir]);

        assert.strictEqual(applied.exitCode, 0, applied.output);
        assert.strictEqual(yield* fs.readFileString(destination), customConfig);
      }),
    );

    it.effect("renders the runner from package scripts without Vite+", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const projectDir = yield* createFixture();

        yield* writeFixture(projectDir, { vitePlus: false, scripts: { check: "vitest run" } });
        yield* fs.writeFileString(path.join(projectDir, "pnpm-lock.yaml"), "lockfileVersion: 9\n");
        const applied = yield* runDevKit(projectDir, ["apply", "--project-dir", projectDir]);

        assert.strictEqual(applied.exitCode, 0, applied.output);
        const config = yield* fs.readFileString(path.join(projectDir, WORKTRUNK_CONFIG_PATH));

        assert.include(config, 'pre-merge = "bun run check"');
        assert.include(config, 'install = "pnpm install"');
      }),
    );

    it.effect("leaves the scaffolded config in place when disabled", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const projectDir = yield* createFixture();
        const applied = yield* runDevKit(projectDir, ["apply", "--project-dir", projectDir]);

        assert.strictEqual(applied.exitCode, 0, applied.output);
        yield* writeFixture(projectDir, { config: false });
        const disabled = yield* runDevKit(projectDir, ["apply", "--project-dir", projectDir]);

        assert.strictEqual(disabled.exitCode, 0, disabled.output);
        assert.isTrue(yield* fs.exists(path.join(projectDir, WORKTRUNK_CONFIG_PATH)));
      }),
    );

    it.effect("rejects repositories without a supported pre-merge command", () =>
      Effect.gen(function* () {
        const projectDir = yield* createFixture();

        yield* writeFixture(projectDir, { vitePlus: false });
        const unsupported = yield* runDevKit(projectDir, ["plan", "--project-dir", projectDir]);

        assert.notStrictEqual(unsupported.exitCode, 0);
        assert.match(
          unsupported.output,
          /requires a direct vite-plus dependency or a root "check" package script/,
        );
      }),
    );

    it.effect("skips command resolution when the repository already owns a config", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const projectDir = yield* createFixture();
        const destination = path.join(projectDir, WORKTRUNK_CONFIG_PATH);

        yield* writeFixture(projectDir, { vitePlus: false });
        yield* fs.makeDirectory(path.dirname(destination), { recursive: true });
        yield* fs.writeFileString(destination, 'pre-merge = "cargo test"\n');
        const planned = yield* runDevKit(projectDir, ["plan", "--project-dir", projectDir]);

        assert.strictEqual(planned.exitCode, 0, planned.output);
      }),
    );
  });
});
