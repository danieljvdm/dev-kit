# Configuration and local development

Locate the owning Worker config and environment before changing a binding.
Prefer JSONC for new configurations when it fits repository conventions;
preserve an existing format for unrelated edits. Check fields against the
installed Wrangler config schema and regenerate binding types through the
repository's normal command after changing them.

Compatibility dates and flags change runtime behavior. Preserve the selected
date during routine edits. When an upgrade is requested or required, read the
relevant compatibility changes and verify affected behavior rather than setting
today's date automatically.

Inspect local and remote binding settings before starting development. Local
development can reach real services when remote bindings are enabled. Keep
private temporary servers separate from any preview managed by the host.
Reuse an existing dev process when it exercises the change.

Use the installed CLI's help for flags and subcommands. The repository's scripts
own ports, environment names, credential loading, and generated file locations.
Do not create a second workflow merely to reproduce an example from this skill.

References:

- [Configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Compatibility dates](https://developers.cloudflare.com/workers/configuration/compatibility-dates/)
- [Local development](https://developers.cloudflare.com/workers/development-testing/)
