import type { OxfmtConfig } from "oxfmt";

import { devKitToolIgnorePatterns } from "./tool-ignore-patterns.ts";

export { devKitToolIgnorePatterns } from "./tool-ignore-patterns.ts";

/**
 * Formatting defaults for this repository's Vite+ config.
 */
export const recommendedOxfmtConfig = {
  arrowParens: "always",
  endOfLine: "lf",
  ignorePatterns: [...devKitToolIgnorePatterns],
  printWidth: 100,
  semi: true,
  singleQuote: false,
  sortImports: true,
  sortPackageJson: true,
  tabWidth: 2,
  trailingComma: "all",
  useTabs: false,
} satisfies OxfmtConfig;

export type RecommendedOxfmtConfig = typeof recommendedOxfmtConfig;
