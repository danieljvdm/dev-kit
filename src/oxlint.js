/**
 * Runtime form of the typed preset declared in oxlint.ts.
 *
 * This file is intentionally plain JavaScript because Node does not strip
 * TypeScript from packages in node_modules when Vite+ loads vite.config.ts.
 */
import { devKitToolIgnorePatterns } from "./tool-ignore-patterns.js";

export { devKitToolIgnorePatterns } from "./tool-ignore-patterns.js";

export const createAbsoluteImportsOxlintOverride = (options) => {
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

export const recommendedOxlintConfig = {
  ignorePatterns: [...devKitToolIgnorePatterns],
  options: {
    typeAware: true,
  },
  jsPlugins: [
    {
      name: "anti-slop",
      specifier: "@danieljvdm/dev-kit/oxlint-plugin-anti-slop",
    },
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
    "anti-slop/no-chained-type-assertions": "error",
    "anti-slop/no-conditional-empty-object-spread": "error",
    "anti-slop/no-known-value-widening": "error",
    "anti-slop/no-module-mocking": "error",
    "anti-slop/no-object-parameters": "error",
    "anti-slop/no-reflect-apply": "error",
    "anti-slop/no-reflect-get": "error",
    "anti-slop/no-runtime-typeof": "error",
    "anti-slop/no-shape-in-symbol-names": "error",
    "anti-slop/no-unknown-parameters": "error",
    "anti-slop/no-unknown-returns": "error",
    "anti-slop/no-unknown-type-aliases": "error",
    "anti-slop/no-unsafe-dictionary-type": "error",
    "anti-slop/no-widen-then-assert": "error",
    "anti-slop/require-safety-comment-for-type-assertion": "error",
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
};
