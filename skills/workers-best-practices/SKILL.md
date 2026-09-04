---
name: workers-best-practices
description: Implement or review Cloudflare Worker handlers, bindings, and runtime behavior.
license: Apache-2.0
---

# Cloudflare Workers

Follow the repository's architecture, command authority, and testing policy.
Use installed Wrangler-generated types and the selected runtime compatibility
settings. Current documentation can explain an API; it does not silently upgrade
the project's runtime or dependencies.

Read for the changed boundary:

- Request handling, streams, background work, or state lifetimes:
  [runtime](references/runtime.md).
- Bindings, configuration, credentials, or observability:
  [configuration](references/configuration.md).
- A review or verification task: [review](references/review.md).

Use the `durable-objects` skill for Durable Object state and coordination, and
`wrangler` for CLI operations, when available and relevant. Otherwise consult
the corresponding Cloudflare documentation. A Worker edit does not require
loading every Cloudflare guide.

Dev Kit maintains this Cloudflare skill fork. See [NOTICE](NOTICE) and
[LICENSE](LICENSE).
