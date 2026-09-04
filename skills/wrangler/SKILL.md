---
name: wrangler
description: Run Wrangler commands to develop, configure, deploy, or inspect Cloudflare Workers and resources.
license: Apache-2.0
---

# Wrangler

Use the repository's declared Wrangler version and command entrypoint. Inspect
the relevant script, config, and command help before composing arguments. With
Vite+, use the repository task or `vp exec wrangler`; use the project's own
package manager elsewhere. Install a missing tool only when needed for the task.

Choose the reference for the operation:

- Bindings, environments, generated types, or local development:
  [configuration](references/configuration.md).
- Deployment, secrets, resource mutations, or recovery:
  [operations](references/operations.md).

Resolve the account, environment, config file, and local versus remote target
before a mutation. Reuse existing authorization. Keep a read-only inspection
read-only, and keep credentials out of arguments, logs, and published artifacts.

Use [Wrangler's documentation](https://developers.cloudflare.com/workers/wrangler/)
when installed help or schemas do not answer the question. Keep examples aligned
with the installed version; updating tools or compatibility dates is a separate
decision from running a command.

Dev Kit maintains this Cloudflare skill fork. See [NOTICE](NOTICE) and
[LICENSE](LICENSE).
