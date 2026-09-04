---
name: sandbox-sdk
description: Build or modify applications using Cloudflare Sandbox SDK.
license: Apache-2.0
---

# Cloudflare Sandbox SDK

This skill covers an application using `@cloudflare/sandbox`. Running ordinary
commands inside an agent's existing sandbox does not require installing the SDK.

Inspect the installed SDK, Worker bindings, image, and lifecycle owner first.
Use the repository's package manager if a dependency change is required.
Docker is relevant to local container execution, not every documentation or
remote SDK task.

- Worker setup, images, and bindings: [setup](references/setup.md).
- Commands, files, interpreter contexts, ports, or cleanup:
  [execution](references/execution.md).

Use the installed API and [official SDK documentation](https://developers.cloudflare.com/sandbox/)
for signatures. Preserve the host platform's ownership of task containers,
previews, authentication, and capability URLs.

Dev Kit maintains this Cloudflare skill fork. See [NOTICE](NOTICE) and
[LICENSE](LICENSE).
