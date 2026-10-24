import { defineConfig } from "vite-plus";

import { createRecommendedVitePlusConfig } from "./src/vite-plus.ts";

const recommended = createRecommendedVitePlusConfig({
  ignorePatterns: ["src/oxlint-plugin-anti-slop/runtime.js"],
  typecheck: {
    command: "effect-tsrs diagnostics --project tsconfig.json --type-check --strict",
  },
});

export default defineConfig({
  ...recommended,
  pack: {
    deps: {
      neverBundle: ["@oxlint/plugins"],
    },
  },
  staged: recommended.staged,
  run: {
    ...recommended.run,
    tasks: {
      ...recommended.run.tasks,
      check: [...recommended.run.tasks.check, "vp run anti-slop:check"],
    },
  },
});
