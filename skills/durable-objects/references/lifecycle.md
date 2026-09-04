# Calls and lifecycle

Use typed RPC for service calls where supported. Retain HTTP handling when the
transport requires it, such as an incoming WebSocket upgrade. Keep caller
authentication and authorization at the actual trust boundary.

Route repeat calls using the same intended object identity. Persist any mapping
needed to recover an opaque generated ID. Changing naming or namespaces can
route traffic to a different object with different storage.

An object has one alarm time; setting it replaces the previous alarm. If the
application owns multiple deadlines, keep those deadlines in durable state and
schedule the next due time. Make alarm work safe under retries and interrupted
execution. External side effects need their own deduplication strategy.

Use hibernating WebSockets when that fits the connection lifecycle. Reconstruct
connection metadata from durable state or supported attachments after waking.
Do not assume a constructor, in-memory map, or ordinary timer survives eviction.
Handle close and error paths without leaving stale application presence.

Inspect the relevant [alarm](https://developers.cloudflare.com/durable-objects/api/alarms/)
or [WebSocket](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)
documentation when modifying those behaviors.
