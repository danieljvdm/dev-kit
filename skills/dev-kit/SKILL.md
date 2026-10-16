---
name: dev-kit
description: Set up repositories with shared project guidance, migrate legacy Dev Kit management, or maintain repository skills.
---

# Dev Kit

Build from the user's requirements and leave outputs under normal repository ownership. Use the transient CLI for catalog and migration mechanics. Preserve repository conventions and existing authorization; generated repositories keep no Dev Kit runtime dependency or lifecycle manager.

For repository setup, TypeScript tooling, or a Cloudflare Worker API, load the installed `project-setup` skill. `dev-kit setup` installs it alongside this entrypoint. For an older installation, add it with `bunx @danieljvdm/dev-kit@latest skills add project-setup`. Its canonical source is [danieljvdm/skills](https://github.com/danieljvdm/skills/tree/main/skills/project-setup).

- Remove legacy Dev Kit manifests or managed configuration: [legacy ejection](references/legacy-eject.md).
- Discover, add, update, fork, or detach skills: [skills](references/skills.md).

Follow installed API documentation and the repository's command, Effect, and testing policies. Verify changed entrypoints with the resulting project's normal commands.
