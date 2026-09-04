# Sandbox setup

Inspect the existing Worker entrypoint, Durable Object binding and migrations,
container image, and instance settings. Export the Sandbox class or the project's
subclass in the way required by the installed SDK. Match the binding to that
export; preserve deployed class names and migration history.

Select the image and SDK versions together using the project's lock and image
policy. Check compatibility before upgrading. Add only dependencies needed by
the workload; avoid pinning all projects to an example image tag or capacity.

Use Docker when exercising local container behavior. Prefer the repository's
existing local or deployed test route and report a missing capability when it
prevents verification. Do not install infrastructure just to inspect SDK code.

For new setup or a missing platform detail, use [the SDK getting-started guide](https://developers.cloudflare.com/sandbox/get-started/)
and [examples](https://github.com/cloudflare/sandbox-sdk/tree/main/examples).
Treat them as examples to adapt to the target repository.
