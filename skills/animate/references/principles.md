# Motion principles

## Purpose and timing

Motion can acknowledge input, explain a state change, or preserve an element's
identity across states. Choose the smallest effect that communicates that
relationship. Keep repeated actions quick and avoid movement that distracts
from reading or acting.

Use the project's existing timing tokens. As starting points, small press or
popover transitions often settle in roughly 100–250ms; larger sheets can need
more time to communicate travel. Judge perceived response and interruption,
not a universal 300ms cutoff. Long explanatory sequences have different needs.

Ease-out often gives input-triggered motion an immediate response; ease-in-out
can suit movement between visible positions. Use a spring when retargeting and
velocity matter. Preserve a deliberate existing curve when it works.

## Spatial continuity

Anchor a popover's scale to its trigger. Centered dialogs can use a centered
origin. Choose a modest scale offset when scaling a surface; avoid shrinking
text into illegibility. A pure fade is valid when spatial movement adds no
information. Match entry and exit paths to the user's spatial expectation.

## Rendering cost

Prefer transform and opacity when they express the intended effect cheaply.
Some expanding content needs layout changes. Contain and measure that work
instead of forbidding height animation or replacing it with a distorted scale.
Scope transitions to intended properties.

Acceleration depends on the property, browser, and animation engine. Check the
installed library and inspect a trace before claiming dropped frames or forcing
a rewrite. [Motion's performance guide](https://motion.dev/docs/performance)
explains rendering and acceleration constraints. Avoid permanent layer promotion
or `will-change` without evidence it helps.

## Accessibility and interaction

Honor reduced-motion preferences by removing or simplifying movement that can
cause discomfort. Retain useful state feedback, using an instant change or a
gentle fade where appropriate. Do not require a fade if the user needs no motion.

Keep focus, keyboard operation, and accessible state synchronized with the
interaction. Decorative transitions must not delay availability of controls.
Gate hover-only effects by hover capability; provide equivalent usable touch
and keyboard behavior.
