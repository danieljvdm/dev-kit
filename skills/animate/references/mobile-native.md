# Mobile web interactions

Use this reference for motion in a mobile website or PWA. Check the interaction
on a phone when possible: desktop device emulation cannot reproduce every touch,
browser chrome, keyboard, or safe-area behavior. For motion timing and reduced
motion, use [principles](principles.md); for drag continuity, use
[gestures](gestures.md).

## Touch feedback

- Gate hover effects with `@media (hover: hover) and (pointer: fine)` so a tap
  does not leave a hover animation stuck. Capability queries accommodate devices
  that have both touch and a mouse.
- Show press feedback when the finger lands, typically with `:active`; a `click`
  handler alone responds after release. Use `pointerdown` when JavaScript must
  start the feedback. Keep the control's action and keyboard behavior intact.
- `touch-action: manipulation` can remove double-tap waiting on tappable
  controls. If the browser's tap highlight is suppressed, provide a visible
  press state in its place.
- Prevent text selection and long-press callouts on control labels when they
  interfere with the interaction. Leave readable content selectable.

## Gestures and moving surfaces

- Set `touch-action` for the axis a custom gesture leaves to the browser:
  `pan-y` for a horizontally dragged carousel and `pan-x` for a vertical sheet
  handle. Use `none` only if the surface handles both axes and users can still
  scroll past it. Prefer native scrolling with CSS scroll snap for a simple
  carousel.
- For a sheet with its own scroll area, contain scroll chaining where needed.
  Avoid blocking `touchmove` globally. Preserve expected page scrolling and
  pull-to-refresh where they belong.
- Use `100dvh` when an app shell or sheet must track the visible viewport as
  browser chrome changes; use `100svh` for a stable first-screen section. Check
  bottom-pinned controls with the keyboard open.
- If a sheet, toast, or bottom control reaches a screen edge, account for safe
  area insets. `env(safe-area-inset-*)` needs `viewport-fit=cover` in the
  viewport meta tag to receive nonzero values.
- On iOS, focus can zoom the page when an input's font size is below 16px.
  Keep mobile input text at least 16px rather than disabling user zoom. Match
  the input's keyboard type and return key to its purpose.
- If browser chrome clashes with the surface beneath it, set `theme-color` for
  the supported color schemes to match the top of the page.

## Verify on a phone

Exercise tap, long press, drag, scroll, interruption, and the software keyboard
for the changed interaction. Check landscape and installed PWA mode when they
are supported targets. If hardware is unavailable, report which behavior was
verified in code or emulation and what remains unverified on a device.
