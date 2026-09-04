# Execution and resource ownership

Choose a sandbox identity that matches the intended user or task isolation.
Reusing an ID can reuse state; a container boundary does not authorize sharing
one user's files or interpreter context with another.

Use command execution for shell workloads and interpreter contexts for stateful
language execution with structured results. Inspect the installed API for
timeouts, streaming, cancellation, exit codes, and file path semantics. Handle
process failure explicitly instead of treating successful transport as a
successful command.

Track the lifetime of processes, contexts, and exposed ports. The owner of a
temporary resource cleans it up, including on cancellation or partial failure.
Keep a user-requested persistent session alive. Do not destroy a host-managed or
shared sandbox merely because one command finished.

Expose a port only when the task calls for it and the host permits it. Treat
preview URLs as capabilities and publish them only through the host's approved
path. Diagnose domain and exposure settings from the current
[service exposure guide](https://developers.cloudflare.com/sandbox/guides/expose-services/).

Before retrying a command that may have written data, inspect its outcome or
use an idempotent operation. Stop when cleanup or authorization cannot be
established and report the exact resource still outstanding.
