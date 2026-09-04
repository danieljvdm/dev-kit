---
name: build-effect-apis
description: Define shared Effect HTTP contracts and implement their handlers, middleware, and server runtimes.
---

# Effect HTTP APIs

Use the shared `HttpApi` value as the source for request and response schemas,
server handlers, generated documentation, and clients. Keep transport contracts
isomorphic and runtime behavior in handlers, services, and Layers.

Read repository Effect instructions and inspect installed declarations for
version-sensitive APIs. Existing imports and the lockfile establish the version
being changed; a name from another release is not a reason to upgrade it.

## Read for the changed boundary

- Endpoint schemas, errors, groups, or API composition:
  [shared contracts](references/shared-contracts.md).
- Handler implementation, middleware, or request-scoped services:
  [server and middleware](references/server-and-middleware.md).
- Schema codec selection: [typed codecs](references/schema-codecs.md).
- Server entrypoint or generated API documentation:
  [runtime assembly](references/runtime-assembly.md).
- Workers bindings, Durable Objects, streams, or raw transport routes:
  [Cloudflare Workers](references/cloudflare-workers.md).
- Cross-boundary verification: [verification](references/verification.md).

For React client queries, mutations, and invalidation, use `effect-atom-state`
when available. Otherwise follow the application's existing client-state layer.
Change consumers when the requested contract or server change affects them.

Let schemas own wire encoding and validation, handlers adapt transport to the
application, and services own orchestration and persistence. Assemble required
Layers at the runtime boundary. Verify changed request and failure behavior with
the repository's commands and testing policy; adding an endpoint does not imply
a new committed test.
