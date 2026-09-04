# Verify an emitted signal

Use this guide when live verification is part of the task and access is available.
A code-only instrumentation change can report local checks and the remaining live
verification without provisioning or deploying an environment.

## Exercise the emitting path

Start the application through its normal repository command when needed and
within scope. Exercise the SDK initialization and the actual changed code path:

- Error capture: a safe existing development trigger or temporary local failure.
- Tracing: the request or operation that creates the span.
- Logging or metrics: the path that emits the relevant record.
- Crons: the job invocation that produces its check-in.

An isolated script that initializes a different SDK instance cannot prove the
application's wiring. Use a distinctive synthetic marker, preserve useful evidence,
and remove temporary trigger code when finished. Avoid disrupting live user traffic
to produce a verification event.

## Inspect the result

Use the available event search or resource lookup to find the matching marker,
project, environment, and time window. Confirm the signal fields requested, such
as a span's parent relationship or a log's attributes. For an exception, inspect
its frames; use [artifact triage](debug-artifacts/index.md) if unreadable frames
prevent the requested verification. A newly uploaded source map needs a new event.

Allow a bounded ingestion interval, then inspect DSN selection, initialization
order, sampling, execution evidence, and network delivery. Correct an identified
query error before retrying. If access is unavailable or the same unexplained
failure persists, report the evidence and missing boundary rather than polling
indefinitely or claiming success.

Return the observed result and event link when available. Redact private payloads.
Changing an issue's status or sending another notification must stay within the
existing task authorization. Distinguish local wiring, observed ingestion, and
verification of the released build.
