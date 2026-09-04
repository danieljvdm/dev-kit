# Choose a Sentry SDK reference

Inspect the package and runtime being changed. Prefer the existing framework SDK
when it fits: TanStack Start, Next.js, NestJS, React Router Framework, and React
Native have integrations beyond generic React or Node. A monorepo can contain
several targets; a Wrangler file elsewhere does not determine a React screen's SDK.

For an existing SDK, read the requested signal file directly under its directory:
`tracing.md`, `error-monitoring.md`, `logging.md`, `metrics.md`, `crons.md`,
`profiling.md`, `session-replay.md`, `user-feedback.md`, or `ai-monitoring.md`,
when present. Use the platform index for new setup, feature support, or an
initialization question. It is not a prerequisite to every signal change.

The retained platform references contain multiple runtimes and feature recipes.
Inspect headings and read the relevant section, not the whole manual. Apply
installation, provisioning, and optional-feature recipes only within the requested
scope; preserve installed versions and consult matching official docs for APIs.

| Platform                                              | Setup and feature index                                   |
| ----------------------------------------------------- | --------------------------------------------------------- |
| Android                                               | [android](android/index.md)                               |
| browser JavaScript                                    | [browser](browser/index.md)                               |
| Cloudflare Workers and Pages                          | [cloudflare](cloudflare/index.md)                         |
| Apple platforms (iOS, macOS, tvOS, watchOS, visionOS) | [cocoa](cocoa/index.md)                                   |
| .NET                                                  | [dotnet](dotnet/index.md)                                 |
| Elixir                                                | [elixir](elixir/index.md)                                 |
| Go                                                    | [go](go/index.md)                                         |
| NestJS                                                | [nestjs](nestjs/index.md)                                 |
| Next.js                                               | [nextjs](nextjs/index.md)                                 |
| Node.js, Bun, and Deno                                | [node](node/index.md)                                     |
| PHP                                                   | [php](php/index.md)                                       |
| Python                                                | [python](python/index.md)                                 |
| Flutter and Dart                                      | [flutter](flutter/index.md)                               |
| React Native and Expo                                 | [react-native](react-native/index.md)                     |
| React                                                 | [react](react/index.md)                                   |
| React Router Framework                                | [react-router-framework](react-router-framework/index.md) |
| TanStack Start React                                  | [tanstack-start](tanstack-start/index.md)                 |
| Ruby                                                  | [ruby](ruby/index.md)                                     |
| Svelte and SvelteKit                                  | [svelte](svelte/index.md)                                 |

For an unsupported platform, use the [official SDK documentation](https://docs.sentry.io/platforms/).
