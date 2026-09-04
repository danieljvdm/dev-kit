# Investigate a Sentry issue

Resolve a supplied issue link or ID directly. Otherwise use a narrow issue search;
[search syntax](search-query-language.md) covers structured filters. Infer the
candidate from the request and evidence; ask when multiple plausible issues remain.
Use available connector tools rather than assuming a fixed tool catalog.

Inspect a representative event, its release and environment, and the matching
source revision. Use the issue distribution to understand affected users and
versions. Collect only the related evidence needed to distinguish causes:

- Captured exceptions: [errors](concepts/errors.md).
- Parent requests and spans: [tracing](concepts/tracing.md).
- Runtime messages: [logs](concepts/logging.md).
- User interactions or reports: [replay](concepts/session-replay.md) or [feedback](concepts/user-feedback.md).
- CPU behavior: [profiling](concepts/profiling.md).
- A scheduled job or threshold firing: [crons](concepts/crons.md), [metrics](concepts/metrics.md), and [monitors](concepts/monitors.md).

A monitor firing may have no exception stack. Verify the job, scheduler, or
underlying events rather than treating it as a captured exception. Seer output,
when available and useful, is a hypothesis to check against the code and evidence.

Keep a diagnosis read-only when that is the request. If asked to fix the issue,
address the proven cause and verify at the strongest relevant boundary. Follow
repository policy for a regression test and use synthetic or redacted data.
If event frames do not match the checkout, resolve the release mismatch before editing.

Use the repository's PR and release workflow when publication is authorized.
Reference the issue so Sentry can associate the fix with its release. A direct
status update is a separate requested action: inspect the tool's current semantics
because resolving an issue may also assign it, and archive may use `ignored`.
Do not mark an issue resolved merely because a local patch exists.
