# Theme ownership

Inspect the existing theme preference, CSS selector, document bootstrap, and
server rendering path before choosing a library. Reuse that implementation
when it already supports the requested behavior.

For our Effect Atom and TanStack applications, keep the shared preference in
the existing atom or settings service. Let one document integration apply the
resolved theme. Avoid introducing another state provider for the same value.

Distinguish the saved preference, such as light, dark, or system, from the
resolved color scheme. A system preference should continue following system
changes. Use the project's existing persistence and SSR conventions to make
first paint agree with hydration. A browser-only preference needs an appropriate
pre-paint bootstrap; a server-readable preference must still handle first visits
and system settings. Verify reload, navigation, and preference changes.

`next-themes` has React and React DOM peer dependencies, not a Next.js runtime
dependency. It can be considered when a project wants its behavior, but is not
our blanket default. Check how its provider and injected script fit the actual
SSR setup rather than copying Next.js layout instructions into TanStack Start.
See the [package metadata](https://github.com/pacocoursey/next-themes/blob/main/next-themes/package.json)
and [official usage guide](https://github.com/pacocoursey/next-themes).
