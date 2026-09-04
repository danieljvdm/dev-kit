# Comparison control

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
