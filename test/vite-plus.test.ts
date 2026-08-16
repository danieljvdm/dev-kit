import { describe, expect, it } from "vitest";

import { createRecommendedVitePlusConfig, devKitToolIgnorePatterns } from "../src/vite-plus.ts";

describe("recommended Vite+ config", () => {
  it("composes quality tasks and matching tool ignores", () => {
    const config = createRecommendedVitePlusConfig();

    expect(config).toMatchObject({
      staged: { "*": "vp check --fix" },
      fmt: { ignorePatterns: devKitToolIgnorePatterns },
      lint: { ignorePatterns: devKitToolIgnorePatterns },
      run: {
        tasks: {
          check: ["vp fmt --check", "vp lint", "vp test", "vp run typecheck"],
          typecheck: "tsc --noEmit",
        },
      },
    });
    expect(config.lint?.jsPlugins).toEqual([
      {
        name: "anti-slop",
        specifier: "./src/oxlint-plugin-anti-slop/runtime.js",
      },
      {
        name: "effect",
        specifier: "./src/oxlint-plugin-effect.js",
      },
      {
        name: "stylistic",
        specifier: "./src/oxlint-plugin-style.js",
      },
    ]);
    expect(config.lint?.rules["anti-slop/no-runtime-typeof"]).toBe("error");
    expect(config.lint?.rules["stylistic/padding-line-between-statements"]).toBeDefined();
    expect(config.lint).not.toHaveProperty("extends");
  });
});
