import { NodeServices } from "@effect/platform-node";
import { assert, describe, layer } from "@effect/vitest";
import { Effect, FileSystem, Path } from "effect";

describe("open-pull-request skill", () => {
  layer(NodeServices.layer)((it) => {
    it.effect("ships a model-triggered reviewer-facing PR workflow", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const testPath = yield* path.fromFileUrl(new URL(import.meta.url));
        const root = path.resolve(path.dirname(testPath), "..");
        const skillDir = path.join(root, "skills", "open-pull-request");
        const skill = yield* fs.readFileString(path.join(skillDir, "SKILL.md"));

        assert.match(skill, /^---\nname: open-pull-request\ndescription: Open pull requests/);
        assert.match(skill, /Use whenever preparing or opening a pull request/i);
        assert.match(skill, /Conventional Commits/);
        assert.match(skill, /`type\(scope\): imperative summary`/);
        assert.match(skill, /someone with little context/i);
        assert.match(skill, /capture and attach a screenshot or short\s+recording/i);
        assert.match(skill, /Include only evidence that was actually produced and verified/i);
        assert.match(skill, /return its URL/i);
        assert.notMatch(skill, /TODO/);
        assert.isTrue(yield* fs.exists(path.join(skillDir, "agents", "openai.yaml")));
      }),
    );
  });
});
