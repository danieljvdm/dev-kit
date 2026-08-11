---
"@danieljvdm/dev-kit": minor
---

Add opt-in absolute (path-alias) import enforcement: `createRecommendedVitePlusConfig({ absoluteImports: { files } })` appends an Oxlint override scoping `import/no-relative-parent-imports` to the given globs, and `createAbsoluteImportsOxlintOverride` exposes the same override for standalone Oxlint configs.
