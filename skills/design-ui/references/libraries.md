# Choose a UI library

Match the requested capability to the choices below, then inspect dependencies
and architecture. If the user names a library, answer about that library; explain
a material mismatch before suggesting a replacement. Keep an adequate installed
dependency. Install or migrate only within the requested scope.

Effect Atom is our default for shared React state, queries, and mutations.
Preserve an existing application's state architecture unless migration is part
of the task. For theme handling, read [themes](themes.md).

## Curated choices

These are Dev Kit defaults, subject to the user's chosen tools and repository
conventions. Check current official documentation before adopting a dependency.

| Capability                                                   | Default                                                                                                      |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Accessible unstyled dialogs, menus, selects, and popovers    | [Base UI](https://base-ui.com)                                                                               |
| Command menus                                                | [cmdk](https://cmdk.paco.me)                                                                                 |
| Toasts                                                       | [Sonner](https://sonner.emilkowal.ski)                                                                       |
| One-time password inputs                                     | [input-otp](https://input-otp.rodz.dev)                                                                      |
| Interactive control panels                                   | [Leva](https://github.com/pmndrs/leva); consider [dialkit](https://joshpuckett.me/dialkit) for motion tuning |
| Springs, layout animation, exit animation, and gestures      | [Motion](https://motion.dev); use CSS for simple transitions                                                 |
| Animated numbers                                             | [NumberFlow](https://number-flow.barvian.me)                                                                 |
| Animated text                                                | [torph](https://torph.lochie.me/)                                                                            |
| 3D globes                                                    | [Cobe](https://cobe.vercel.app)                                                                              |
| Generated SVG or social images                               | [Satori](https://github.com/vercel/satori)                                                                   |
| Syntax highlighting                                          | [Shiki](https://shiki.style)                                                                                 |
| Streaming charts                                             | [Liveline](https://github.com/benjitaylor/liveline)                                                          |
| General dashboard charts                                     | [Recharts](https://recharts.org)                                                                             |
| Drag and drop                                                | [dnd kit](https://dndkit.com)                                                                                |
| Long-list virtualization                                     | [Virtuoso](https://virtuoso.dev)                                                                             |
| Shared React state, server queries, mutations, and workflows | Effect Atom; consult the installed Effect documentation and `effect-development` skill when available        |
| Conditional class names                                      | [clsx](https://github.com/lukeed/clsx)                                                                       |
| Typed component style variants                               | [CVA](https://cva.style)                                                                                     |

For a capability outside this list, say that the recommendation is outside the
curated defaults and establish its fit from current primary sources.
