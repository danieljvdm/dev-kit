# Operations

Identify the selected account, Worker or resource, environment, and local or
remote target. An environment flag does not guarantee every resource setting
is inherited; inspect the effective config and binding before acting.

For a deployment, use the repository's release procedure and required checks.
Use a dry run when it materially checks packaging or bindings. A dry run does
not prove runtime behavior or authorize deployment. Reuse any deployment
authorization already present in the task.

Preview the target and impact of deletion, migrations, or resource replacement.
Use existing backup or recovery procedures where the operation calls for them.
Inspect versions before a rollback; code rollback may not undo data changes.

After a timeout or partial failure, inspect the resulting resource or deployment
before retrying a mutation. Retry only the missing work. Stop and report the
remaining state when access is unavailable, the target is ambiguous, or further
retries could duplicate consequential work.

Use protected input or the repository's secret integration for credentials.
Preserve existing authentication instead of starting an interactive login
unnecessarily. Report deployment and resource identifiers without exposing
secrets or private preview capabilities.
