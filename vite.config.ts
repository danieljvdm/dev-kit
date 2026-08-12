import { createRecommendedVitePlusConfig } from "@danieljvdm/dev-kit/vite-plus";
import { defineConfig } from "vite-plus";

const recommended = createRecommendedVitePlusConfig({
  ignorePatterns: ["src/oxlint-plugin-anti-slop/runtime.js"],
});

export default defineConfig({
  ...recommended,
  staged: recommended.staged,
  run: {
    ...recommended.run,
    tasks: {
      ...recommended.run.tasks,
      check: [...recommended.run.tasks.check, "vp run anti-slop:check"],
    },
  },
});
