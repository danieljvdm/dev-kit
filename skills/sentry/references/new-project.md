# Select a Sentry project

Reuse a project identified by the request or existing configuration. When live
lookup is needed, use the available authenticated connector or repository tooling
to inspect organizations and projects. Multiple accessible organizations do not
require a question if the request already identifies the target.

Resolve the organization, project, and team before creation. Read the current tool
schema for required fields. Use existing task authorization; ask only when a new
resource or destination is outside that scope or remains ambiguous. Follow the
user's configured secret and environment system for the DSN and authentication.

After creation, retain the returned project identity. An unavailable DSN does not
mean project creation failed: inspect that project and its client keys before
retrying. If access is denied, preserve the prepared configuration and report the
missing capability. An authentication failure alone does not prove the user lacks
an account.
