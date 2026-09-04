---
name: design-ui
description: Build or refine web UI, explore design alternatives, or choose UI libraries and theme handling.
license: MIT
---

# Design web UI

Follow the brief and the product's design language. Implement a requested change;
keep a review to findings unless implementation is also requested.

Read only what the task needs:

- Control behavior, focus, feedback, and content states: [components](references/components.md).
- Typography, hierarchy, depth, or Apple-inspired materials: [appearance](references/appearance.md).
- Requested design alternatives or a visual comparison picker: [exploration](references/exploration.md).
- Requested library selection: [libraries](references/libraries.md).
- Theme switching, persistence, first paint, or hydration: [themes](references/themes.md).

Use the existing tokens and adequate dependencies. Library selection and multiple
prototypes are optional workflows, not prerequisites to polishing a component.
For detailed motion work, use `animate` when available, or consult the installed
animation library and [Emil's motion guidance](https://emilkowal.ski/ui/you-dont-need-animations).

Judge the changed interaction in context with realistic content, keyboard input,
and relevant viewport sizes. Preserve deliberate product choices and report what
could not be verified.

Attribution is in [NOTICE](NOTICE); terms are in [LICENSE](LICENSE).
