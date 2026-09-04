---
name: pick-ui-library
description: Choose a UI library from Dev Kit's curated defaults when the user requests library selection.
license: MIT
---

# Pick a UI library

Use this skill when explicitly requested. Match the requested capability to
[the curated choices](references/libraries.md), then check the project's
dependencies and architecture. If the user names a library, answer about that
library; explain a material mismatch before suggesting a replacement.

Keep an adequate installed dependency. Recommend one default when the fit is
clear, with the reason and relevant tradeoff. Install or migrate only within
the requested scope, using the repository's package manager.

Effect Atom is our default for shared React state, queries, and mutations. Use
the `effect-atom-state` skill for implementation when available. Preserve an
existing application's state architecture unless migration is part of the task.

For theme switching or dark mode, read [themes](references/themes.md). Theme
ownership, first paint, and hydration determine the choice; the router's name
alone does not.

This is a Dev Kit fork of Emil Kowalski's skill. See [NOTICE](NOTICE) and
[LICENSE](LICENSE).
