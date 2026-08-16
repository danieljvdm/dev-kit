import { describe, expect, it } from "vitest";

import { recommendedOxlintConfig } from "../src/oxlint.ts";

describe("recommended Oxlint config", () => {
  it("enables the Vite+ plugins and type-aware rules", () => {
    expect(recommendedOxlintConfig.ignorePatterns).toEqual([
      ".agents/**",
      ".claude/**",
      ".dev-kit/**",
      ".opencode/**",
      ".repos/**",
      ".vite-hooks/_/**",
    ]);
    expect(recommendedOxlintConfig.options).toEqual({ typeAware: true });
    expect(recommendedOxlintConfig.jsPlugins).toEqual([
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
    expect(recommendedOxlintConfig.rules["anti-slop/no-known-value-widening"]).toBe("error");
    expect(recommendedOxlintConfig.rules["anti-slop/no-module-mocking"]).toBe("error");
    expect(
      recommendedOxlintConfig.rules["anti-slop/require-safety-comment-for-type-assertion"],
    ).toBe("error");
    expect(recommendedOxlintConfig.plugins).toEqual(["import", "react", "vitest"]);
    expect(recommendedOxlintConfig.rules["import/no-duplicates"]).toEqual([
      "error",
      { preferInline: true },
    ]);
    expect(recommendedOxlintConfig.rules["react/rules-of-hooks"]).toBe("error");
    expect(recommendedOxlintConfig.rules["stylistic/padding-line-between-statements"]).toEqual([
      "error",
      { blankLine: "always", prev: ["const", "let", "var"], next: "*" },
      {
        blankLine: "any",
        prev: ["const", "let", "var"],
        next: ["const", "let", "var"],
      },
      { blankLine: "always", prev: "*", next: "return" },
    ]);
    expect(recommendedOxlintConfig.rules["typescript/switch-exhaustiveness-check"]).toBe("error");
    expect(recommendedOxlintConfig.rules["typescript/consistent-type-imports"]).toEqual([
      "error",
      { fixStyle: "inline-type-imports", prefer: "type-imports" },
    ]);
    expect(recommendedOxlintConfig.rules["typescript/no-floating-promises"]).toBe("off");
    expect(recommendedOxlintConfig.rules["vitest/no-standalone-expect"]).toBe("off");
    expect(recommendedOxlintConfig.overrides[0]?.rules["typescript/no-non-null-assertion"]).toBe(
      "off",
    );
  });
});
