import { NodeServices } from "@effect/platform-node";
import { assert, describe, layer } from "@effect/vitest";
import { Effect, FileSystem, Path } from "effect";

describe("effect-atom-state skill", () => {
  layer(NodeServices.layer)((it) => {
    it.effect("ships a routed Effect Atom client state guide", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const testPath = yield* path.fromFileUrl(new URL(import.meta.url));
        const root = path.resolve(path.dirname(testPath), "..");
        const skillDir = path.join(root, "skills", "effect-atom-state");
        const referencesDir = path.join(skillDir, "references");
        const skill = yield* fs.readFileString(path.join(skillDir, "SKILL.md"));

        assert.match(skill, /^---\nname: effect-atom-state\ndescription: /);
        assert.notMatch(skill, /TODO/);
        assert.isTrue(yield* fs.exists(path.join(skillDir, "agents", "openai.yaml")));

        // The description is the trigger surface: it must fire on consumer-side
        // React work, not only on contract or client derivation vocabulary.
        const description = skill.match(/^---\n[\s\S]*?description: (.*)$/m)?.[1] ?? "";

        for (const trigger of [
          "client-side state",
          "server data",
          "TanStack/React Query",
          "Zustand",
          "data fetching",
          "caching",
          "refactoring",
          "useAtomValue",
          "useAtomSet",
          "useAtom",
          "mutation",
          "reactivity",
          "optimistic",
          "AtomHttpApi",
          "HttpApiClient",
          "Effect→Promise boundary",
          "TanStack Start",
        ]) {
          assert.include(description, trigger);
        }

        const expectedReferences = new Set([
          "effect-atom-client.md",
          "effect-atom-lifecycle.md",
          "effect-atom-testing.md",
          "effect-atom-workflows.md",
          "tanstack-start.md",
        ]);
        const referenceNames = new Set(yield* fs.readDirectory(referencesDir));

        assert.deepEqual(referenceNames, expectedReferences);

        const routedReferences = new Set(
          [...skill.matchAll(/\]\(references\/([^)]+\.md)\)/g)].flatMap((match) =>
            match[1] === undefined ? [] : [match[1]],
          ),
        );

        assert.deepEqual(routedReferences, expectedReferences);

        // The boundary doctrine lives in the skill body.
        assert.match(skill, /Keep the Promise boundary logic-free/);
        assert.match(skill, /mode: "promise"/);
        assert.match(skill, /`\.then` or `\.catch`/);
        assert.match(skill, /Atom\.fn/);
        assert.match(skill, /get\.setResult/);
        assert.match(skill, /untracked/);
        assert.match(skill, /reactivity keys/);
        assert.match(skill, /one `Reactivity` instance spans them/);
        assert.match(skill, /Atom\.family/);
        assert.match(skill, /view state/);
        assert.match(skill, /lint warning on `then`/);
        assert.match(skill, /\$build-effect-apis/);

        const atomClient = yield* fs.readFileString(
          path.join(referencesDir, "effect-atom-client.md"),
        );
        const atomLifecycle = yield* fs.readFileString(
          path.join(referencesDir, "effect-atom-lifecycle.md"),
        );
        const atomTesting = yield* fs.readFileString(
          path.join(referencesDir, "effect-atom-testing.md"),
        );
        const atomWorkflows = yield* fs.readFileString(
          path.join(referencesDir, "effect-atom-workflows.md"),
        );
        const tanstack = yield* fs.readFileString(path.join(referencesDir, "tanstack-start.md"));

        assert.match(skill, /AtomHttpApi\.Service/);
        assert.match(atomClient, /reactivity-key constructors/);
        assert.match(atomClient, /HttpApiMiddleware\.layerClient/);
        assert.match(atomLifecycle, /AsyncResult\.all/);
        assert.match(atomLifecycle, /Atom\.Interrupt/);
        assert.match(atomTesting, /unmounting one\s+consumer does not cancel work/);
        assert.match(atomWorkflows, /Atom\.fn<Input>\(\)/);
        assert.match(atomWorkflows, /Reactivity\.mutation/);
        assert.match(atomWorkflows, /get\.setResult/);
        assert.match(atomWorkflows, /Atom\.optimisticFn/);
        assert.match(atomWorkflows, /no-restricted-properties/);
        assert.match(tanstack, /request-specific runtime\/layers per request/);
      }),
    );
  });
});
