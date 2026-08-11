import type { OxlintConfig, OxlintOverride } from "oxlint";

import { devKitToolIgnorePatterns } from "./tool-ignore-patterns.ts";

export { devKitToolIgnorePatterns } from "./tool-ignore-patterns.ts";

export type AbsoluteImportsOptions = {
  /** Globs that must use path-alias imports, e.g. `"apps/app/src/**"`. */
  readonly files: ReadonlyArray<string>;
};

/**
 * Build an Oxlint override that forbids `../` imports inside the given globs,
 * so those files import through tsconfig path aliases such as `@/*`. Append it
 * to a standalone Oxlint config's `overrides`, or opt in through
 * `createRecommendedVitePlusConfig({ absoluteImports })`.
 */
export const createAbsoluteImportsOxlintOverride = (
  options: AbsoluteImportsOptions,
): OxlintOverride => {
  if (options.files.length === 0) {
    throw new Error("absolute imports enforcement requires at least one file glob");
  }
  const files = [...new Set(options.files)];

  if (files.length !== options.files.length) {
    throw new Error("absolute imports file globs must be unique");
  }
  for (const glob of files) {
    if (glob.trim().length === 0) {
      throw new Error("absolute imports file globs must not be blank");
    }
  }

  return {
    files,
    rules: {
      "import/no-relative-parent-imports": "error",
    },
  };
};

/**
 * High-signal Oxlint defaults for TypeScript projects.
 *
 * Extend this object from standalone Oxlint's `extends`, or from Vite+'s
 * `lint.extends`, so project-local plugins, rules, and overrides compose
 * without losing nested configuration.
 */
export const recommendedOxlintConfig = {
  ignorePatterns: [...devKitToolIgnorePatterns],
  options: {
    typeAware: true,
  },
  jsPlugins: [
    {
      name: "effect",
      specifier: "@danieljvdm/dev-kit/oxlint-plugin-effect",
    },
    {
      name: "stylistic",
      specifier: "@danieljvdm/dev-kit/oxlint-plugin-style",
    },
  ],
  plugins: ["import", "react", "vitest"],
  rules: {
    eqeqeq: "error",
    "import/default": "off",
    "import/namespace": "off",
    "import/no-cycle": "error",
    "import/no-duplicates": ["error", { preferInline: true }],
    "import/no-self-import": "error",
    "react/exhaustive-deps": "error",
    "react/rules-of-hooks": "error",
    "stylistic/padding-line-between-statements": [
      "error",
      { blankLine: "always", prev: ["const", "let", "var"], next: "*" },
      {
        blankLine: "any",
        prev: ["const", "let", "var"],
        next: ["const", "let", "var"],
      },
      { blankLine: "always", prev: "*", next: "return" },
    ],
    "typescript/consistent-type-imports": [
      "error",
      { fixStyle: "inline-type-imports", prefer: "type-imports" },
    ],
    "typescript/no-floating-promises": "off",
    "typescript/no-explicit-any": "error",
    "typescript/no-misused-spread": "off",
    "typescript/no-non-null-assertion": "error",
    "typescript/require-array-sort-compare": "off",
    "typescript/restrict-template-expressions": "off",
    "typescript/switch-exhaustiveness-check": "error",
    "unicorn/prefer-node-protocol": "error",
    "vitest/no-focused-tests": "error",
    "vitest/no-identical-title": "error",
    "vitest/no-standalone-expect": "off",
    "vitest/valid-expect": "error",
  },
  overrides: [
    {
      files: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
      rules: {
        "typescript/no-non-null-assertion": "off",
      },
    },
  ],
} satisfies OxlintConfig;

export type RecommendedOxlintConfig = typeof recommendedOxlintConfig;
