---
"@danieljvdm/dev-kit": major
---

Consolidate owned skills into eight task entrypoints with conditional references.
Replace retired selectors explicitly when adopting this release:

- `animate`: motion improvement, review, opportunities, and animation vocabulary.
- `design-ui`: Apple/design-engineering guidance, prototypes, and UI library selection.
- `cloudflare-workers`: Worker practices, Durable Objects, Wrangler, and Sandbox SDK.
- `effect-development`: Effect setup, architecture, HTTP APIs, CLIs, and Atom state.
- `sentry`: all eight Sentry workflows, sharing platform and signal references.
- `testing`: test selection and explicitly requested TDD.

`dev-kit` and `open-pull-request` remain separate task entrypoints. The `effect`
family now selects `effect-development`. Existing consumer files are repo-owned;
install the replacements, preserve local guidance, and remove retired copies
when adopting. Old individual selectors are no longer in the catalog.

Use Effect Atom for shared React state, choose theme handling from the existing
SSR and persistence setup, preserve user scope, and follow repository testing
policy. Retain upstream licenses and pinned provenance for maintained forks.
