import {
  createRecommendedVitePlusConfig as createPackagedConfig,
  devKitToolIgnorePatterns,
} from "@danieljvdm/dev-kit/vite-plus";
import { describe, expect, it } from "vitest";

describe("recommended Vite+ config", () => {
  it("composes quality tasks and matching tool ignores", () => {
    const config = createPackagedConfig();

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
        name: "effect",
        specifier: "@danieljvdm/dev-kit/oxlint-plugin-effect",
      },
      {
        name: "stylistic",
        specifier: "@danieljvdm/dev-kit/oxlint-plugin-style",
      },
    ]);
    expect(config.lint?.rules["stylistic/padding-line-between-statements"]).toBeDefined();
    expect(config.lint).not.toHaveProperty("extends");
  });
});
