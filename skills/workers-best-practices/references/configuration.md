# Worker configuration

Use generated binding types and the effective configuration for the target
environment. Prefer service and resource bindings when available; use external
APIs where the integration requires them. Preserve existing database connection
ownership and evaluate Hyperdrive only for the relevant connection needs.

Add compatibility flags when required by the dependencies actually in use.
Treat compatibility-date changes as runtime changes with their own verification.
Keep secrets in the repository's configured secret store or binding mechanism.

For error capture, structured logs, tracing, sampling, and sensitive fields,
follow the repository's reporting policy. A narrow Worker edit is not a reason
to install another telemetry system or change global sampling.

Retrieve the relevant [Workers best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/)
when a platform-specific question remains. Validate signatures against the
installed toolchain instead of downloading newer types to judge older code.
