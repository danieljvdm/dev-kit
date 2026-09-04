# Worker runtime boundaries

Keep request-specific state and I/O resources within the request or an explicit
application lifetime. Immutable constants can be shared; mutable globals must
not leak one request's identity or data into another.

Stream large or unbounded bodies rather than buffering them. Preserve stream
cancellation and backpressure, and avoid consuming a body twice. Bound work
that depends on client-controlled sizes or upstream responses.

Await work required for the response. Use the execution context for permitted
post-response work that fits its lifetime. `void` alone does not keep a Promise
alive or handle its failure. Use durable execution such as a queue or workflow
when the work must outlive that request lifetime.

Keep authentication, decoding, and error mapping at the appropriate boundary.
In Effect applications, preserve the existing service and Layer ownership.
Do not force a plain async example into an established Effect handler design.

Use the installed types and relevant [Workers runtime documentation](https://developers.cloudflare.com/workers/runtime-apis/)
to check limits and API behavior that affect the task.
