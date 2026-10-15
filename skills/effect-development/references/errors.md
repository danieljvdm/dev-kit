# Error handling and reporting

Use this reference when changing recovery, error translation, reporting, or
resource cleanup. For an audit, trace the requested operations through their
services and runtime adapters; a small fix does not require a library-wide
rewrite. Read the installed Effect guidance first. Its source owns the exact
semantics of `Cause`, recovery, interruption, and finalizers.

## Preserve meaning through composition

Keep expected failures in a concrete `E` and dependencies visible in `R`.
Defects and interruption remain distinct from domain rejection. `E = never`
does not mean an effect cannot fail, and cancellation does not mean its cleanup
succeeded.

Let failures propagate through internal services unless a boundary owns a real
translation or recovery policy. Preserve useful typed values, original private
causes, and annotations. If a domain error wraps a dependency failure, retain
that cause internally without making it part of a public wire schema. Logging
an error and replacing it with a generic value does not preserve its cause.

A failed operation can carry several reasons: a typed failure, a concurrent
defect, and interruption or failed cleanup. Check the installed implementations
of `mapError`, `orDie`, `catch`, and tag-based recovery before using them at a
composed boundary. Implementations that select the first typed failure can
discard its siblings; the resulting type signature does not reveal that loss.

For a required pure typed-error translation, the Effect 4 form is:

```ts
work.pipe(Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, toDomainError))));
```

`Cause.map` transforms each typed failure while preserving defects,
interruption, and their annotations. The translator must not throw. Use the
installed version's equivalent rather than copying this shape across major
versions. Keep simple leaf mappings when their failure semantics suffice;
do not mechanically replace every `mapError` or introduce a generic wrapper
around every service.

## Recover only what the boundary owns

Expected absence, invalid input, authorization denial, and intentional
cancellation can be normal outcomes. Define which ones this operation recovers
and what successful recovery means. A permission lookup outage must not become
permission granted, and a storage outage must not become an empty database.

When recovery discards a failure entirely, ensure the whole Cause is expected.
A first `NotFound` does not justify returning an empty result if another reason
is a cleanup defect. Where mixed reasons are possible, inspect them with the
installed Cause API and propagate the original Cause when the recovery policy
does not cover all of them. Treat pure interruption according to the caller's
cancellation contract; do not silently drop defects attached to interruption.

Keep protocol translation around the operation it classifies. A catch intended
to translate credential verification must not also turn failures from the
protected application handler into ordinary authentication denial.

## Observe once at the right boundary

Separate propagation, reporting, and public projection. Choose an owner for
unexpected-failure reporting, such as the request runner, background worker, or
client workflow. Lower services normally propagate; the owner observes the
complete Cause before projecting the permitted public result.

For sensitive values, build telemetry from finite categories and explicitly
allowlisted codes. Do not pass raw error messages, nested causes, credentials,
provider responses, SQL values, payloads, or arbitrary URLs to logging,
tracing, serialization, or UI error state. Redacting the final response is too
late if an earlier span or logger already captured the private value.

If failures cross several reporting boundaries, use the project's existing
ownership or annotation mechanism to prevent duplicate captures. Preserve the
ability to report a new cleanup failure added after the original capture; a
blanket "already reported" flag for the whole operation can hide it.

Verify observation at the actual execution root. Providing a Logger does not
itself observe discarded `Exit`s, rejected promises, failed Atom results, or
closing fibers. Check the context used for runtime startup, disposal, and
background work; it may differ from the invoking request's context. Follow the
[Atom lifecycle guide](atom/effect-atom-lifecycle.md) when registry ownership is
involved.

For best-effort diagnostic sinks, a reporter failure must not replace the
operation's original failure. Use a bounded, safe fallback only where required;
avoid recursive reporting and state the delivery limit. Required durable audit
writes are a separate operation contract, not best-effort logging.

## Retain cleanup and external-outcome information

Use Scope ownership and structured concurrency. Prefer existing scoped
combinators; introduce custom lifetime machinery only for a demonstrated gap.
Inspect returned `Exit`s when stopping or awaiting owned work. Interrupting a
child, waiting for it, and propagating its cleanup failure are separate duties.
For cancellation and timeout boundaries, verify that finalizers finish and
that their failures survive the final result. Independent cleanup should still
be attempted after an earlier cleanup failure.

At Promise, stream, browser, native, and callback adapters, check who observes
rejection and who releases listeners, locks, or handles. Deliberately retired
callbacks may be ignored under a documented ownership rule. Active unexpected
failures need an observable owner. A synchronous disposal method may start
asynchronous work without waiting for completion or telemetry delivery.

Preserve retry classification and exhaustion failures. Retrying because an
error was mapped to "unavailable" can repeat an external side effect whose
outcome is unknown. Keep transaction atomicity, durable identities, receipts,
and uncertainty intact; neither a timeout nor a lost response proves rollback.

If a dependency swallows a cause before returning, a later catch cannot recover
it. Fix the owning dependency and track adoption of a verified published
release. A development catalog or local patch alone does not establish that
published consumers receive the fix; inspect their dependency constraints too.

## Verify the specific failure path

Use existing checks and the smallest real workflow that distinguishes the
reported defect from intended recovery. Follow repository testing policy;
when isolation is necessary, record the scoped failure inventory and obtain a
meaningful failing proof before implementation. Preserve evidence outside
product guidance. Do not add a blanket scenario matrix or mirror the code in
tests.

Inspect the outcome relevant to the defect: retained reason/value identity,
report count and safe fields, cleanup completion, or committed state and
side-effect count. Include the corresponding expected recovery control.
Separate source-reviewed paths from exercised paths and record untested
runtime or dependency boundaries.

TypeScript and Effect compiler diagnostics can enforce typed contracts and
flag suspicious constructs. Lint can flag discarded promises/results or
catch-to-default patterns, but cannot prove whole-Cause preservation, reporter
installation, privacy, or safe retry semantics. Treat such diagnostics as
review prompts, not a reason to ban all recovery or claim no failure can ever
be swallowed.
