---
name: durable-objects
description: Implement or review Cloudflare Durable Object storage, coordination, alarms, and WebSockets.
license: Apache-2.0
---

# Durable Objects

Identify the object's identity, coordination scope, durable state, and callers.
Preserve the application's ownership model and installed platform APIs.

Read the reference for the behavior being changed:

- Storage, concurrency, schema evolution, or initialization:
  [state](references/state.md).
- RPC, alarms, WebSockets, hibernation, or eviction:
  [lifecycle](references/lifecycle.md).
- Runtime verification or an authorized regression test:
  [verification](references/verification.md).

Use official [Durable Object documentation](https://developers.cloudflare.com/durable-objects/)
for exact current behavior and the installed types for implementation. Preserve
existing storage and class migrations; a new-example configuration must not
replace a deployed object's identity or history.

Dev Kit maintains this Cloudflare skill fork. See [NOTICE](NOTICE) and
[LICENSE](LICENSE).
