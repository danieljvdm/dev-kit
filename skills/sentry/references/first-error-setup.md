# First-error setup

Inspect the requested application and existing Sentry configuration before adding
anything. Infer the platform from manifests, imports, and runtime configuration.
Use the [SDK index](sdks/index.md) to find the matching platform, then read its
error-monitoring guide. Read tracing guidance only if that signal is in scope.

Reuse the project's configured destination. If provisioning is needed, follow
[project selection](new-project.md). Preserve existing authorization and clarify
only unresolved organization, team, or project choices.

Install and initialize the SDK through the repository's commands and configuration
policy. Keep one initialization path and preserve existing error boundaries.
Honor the requested signals and sampling choices. SDK defaults are a starting
point; an errors-only request does not require enabling tracing or optional signals.

For end-to-end setup, use [verification](setup-verification.md) to exercise a safe
path through the real application's initialization and inspect the resulting event.
For code-only work, run the relevant configuration/build checks and name the live
verification that remains. Missing access is not evidence that the SDK is broken.

If release integration is requested, read [releases](release-workflow.md) and
[debug artifacts](artifacts.md) for matching version tags and readable deployed
frames. Use the authorized release process. A local setup task can finish locally;
it does not require encouraging or performing a production deployment.
