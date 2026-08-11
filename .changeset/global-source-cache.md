---
"@danieljvdm/dev-kit": minor
---

Share skill-source and Effect-source downloads through a machine-global cache.

Catalog source checkouts now materialize into `$XDG_CACHE_HOME/dev-kit`
(`~/Library/Caches/dev-kit` on macOS, `~/.cache/dev-kit` elsewhere, overridable
with `DEV_KIT_CACHE_DIR`) keyed by source id and resolved commit SHA, instead
of the per-project `.dev-kit/cache`. A fresh git worktree with the same pinned
sources applies without any network access, and `dev-kit plan` no longer
re-fetches catalog sources on every run — the dry-run path reads and populates
the same cache. Cache population stages into a temp sibling and renames
atomically, so concurrent applies from different worktrees are safe. Because
entries are immutable and commit-keyed, populating the cache is not project
state; planning and `--locked` verification use it without violating their
read-only project semantics.

The `setup.effectSource` checkout keeps its per-project `.repos/effect`
working copy but clones and fetches tags from a shared cached repository in
the same global cache, contacting the network only when a tag is missing from
the cache.

Stale project-local `.dev-kit/cache/catalog` directories left by earlier
versions are removed on apply (best effort); they were regenerable and are no
longer read.
