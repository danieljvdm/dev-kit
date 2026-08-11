---
"@danieljvdm/dev-kit": minor
---

Split the consumer half of `build-effect-apis` into a new `effect-atom-state` skill so client-side work actually triggers it.

- New `effect-atom-state` skill owns Effect Atom client state and React integration: deriving `AtomHttpApi`/`HttpApiClient` clients, query/mutation atoms, reactivity keys, `Atom.fn` workflows, optimistic updates, lifecycle, testing, and TanStack Start. Its description triggers on writing or refactoring React components that read or dispatch atoms — the case the old server-flavored description never matched. The skill body carries the Effect→Promise boundary doctrine: business logic stays in Effect, promise-mode dispatches are returned bare to promise-shaped leaf components, multi-step workflows compose atoms through the fn context, cross-query invalidation is declared as reactivity keys, and optimistic state lives in `Atom.family` atoms.
- `build-effect-apis` keeps the contract spine and server: shared contracts, handlers and middleware, runtime assembly, Cloudflare Workers, and verification. It routes consumer changes to `$effect-atom-state`. The `effect` family now installs both.
- `setup.agentInstructions` renders a terse Effect Atom client boundary section into the managed AGENTS.md when the project (or one of its workspace packages) depends on `@effect/atom-react`.
