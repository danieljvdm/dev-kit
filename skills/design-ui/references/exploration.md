# Explore UI alternatives

Build distinct responses to the requested brief. Keep the exploration separate
from production integration until the user chooses or delegates the choice.

## Alternatives

Identify the component's job, surrounding UI, existing tokens, and important
interaction states. Choose a small set of directions that differ in layout,
density, hierarchy, or interaction. Three is a useful starting point, not a quota.
Name the distinction so the user knows what each alternative explores.

Build in an isolated route or page when there is a project, or in a standalone
artifact when appropriate. Make relevant interactions work with realistic
content. Use the same surrounding context to make comparison meaningful.

Run the alternatives and check the interactions and console. Capture useful
evidence when tools permit. Present the picker with a short explanation of
each direction's tradeoff. Leave the selection to the user unless they have
already asked you to choose.

## Comparison control

Use a compact, accessible selector that stays clear of the work. Render one
alternative at full size unless side-by-side comparison better serves the
request. Make the active selection explicit to sighted and assistive users.

Provide buttons and optionally number or arrow shortcuts. Ignore shortcuts
while the user edits an input or holds a modifier. Keep the selector usable by
keyboard, show focus, and give each alternative a descriptive name.

Preserve selection across reload when useful, for example with a validated URL
parameter. Invalid or missing selections fall back to a valid alternative.
Switch promptly; avoid adding a transition that obscures the differences.

Add replay only for motion that needs it. Define whether changing alternatives
resets their interaction state; use a keyed remount when reset is intended.
Adapt appearance to the project and ensure the picker never covers the behavior
being evaluated.

## Promote a selection

Integrate the selected design using the repository's existing component,
state, and style ownership. Preserve the chosen behavior and verify it in the
real destination. The prototype may have simplified data or lifecycle handling
that needs the application's established implementation.

Remove temporary alternatives and the picker after integration unless the user
wants them retained. For another exploration round, keep useful infrastructure
and vary the chosen direction according to the new brief.
