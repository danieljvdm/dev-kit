# OpenTelemetry Collector export to Sentry

Inspect the existing Collector deployment, pipelines, and installed components.
Add Sentry to the pipeline that owns the requested signal. Preserve other exporters
and avoid creating a parallel Collector unless isolation is part of the request.

Use the installed Collector version's [Sentry Exporter specification](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/sentryexporter)
and example configuration. Verify support before changing dependencies. Follow
the repository's deployment method and secret system rather than automatically
installing the latest binary, Docker image, or a new `.env` file.

Determine service-to-project routing and whether project creation is authorized.
Automatic project creation affects team ownership and may lose initial telemetry;
inspect its behavior and configure it only within the requested scope. Preserve
existing projects and the user's chosen organization.

Keep credential references in configuration and actual values in the secret system.
Use least-required permissions and avoid a detailed debug exporter that prints
private telemetry. Validate the configuration with the installed Collector, then
run it through the authorized deployment or local execution path. Inspect actual
trace/log arrival and routing, not just a successful process start.

When an application also uses a Sentry SDK, check its version-matched OTLP
integration so errors and Collector traces remain correlated. Keep one owner for
sampling and propagation. Read the relevant [SDK reference](sdks/index.md) or
platform's OTLP docs for Python, Ruby, or Node.js only when it applies.

Report configuration-only verification if live credentials or deployment are
outside scope. On failure, inspect the identified config or routing error before
retrying; do not remove an existing Collector just to clear a container name.
