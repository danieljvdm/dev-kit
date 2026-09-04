# Verify the boundary

Follow repository policy for test placement and whether a committed regression
is warranted. Reuse the existing Worker test environment and generated bindings.
Avoid creating a standalone test configuration beside an established one.

Choose verification based on the changed behavior: RPC response and failure,
durable data after a new instance, retry-safe alarm handling, or connection
state after hibernation. Include real migrations when schema behavior matters.
In-memory mocks alone cannot establish platform storage or lifecycle semantics.

Use [Cloudflare's testing guidance](https://developers.cloudflare.com/durable-objects/testing/)
for runtime-specific helpers, checked against installed versions. Exercise the
running application when tests are not warranted. State when eviction, retries,
or multi-request coordination remain unverified.
