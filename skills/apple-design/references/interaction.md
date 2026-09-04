# Direct manipulation

Make feedback start with the input. During a drag, preserve the grab offset and
track the pointer continuously. On release, settle from the actual position and
velocity. An interrupted transition should accept the user's new direction
without finishing an obsolete movement first.

Use the installed library's spring and momentum facilities when they express
the behavior. Tune to the component's size and gesture; a borrowed spring or
dismissal threshold needs its units and context. Resistance near a limit can
explain the boundary without breaking ordinary one-to-one tracking.

Use spatially coherent paths and origins. Hints should point toward the action
they teach. Keep feedback concise for repetitive interactions and avoid adding
sound or haptics without a useful purpose and platform support.

Check cancellation, reversal, scroll interaction, reduced motion, and keyboard
alternatives for the changed interaction. Use a touch device when gesture feel
matters. Consult `animate` for detailed motion workflows when available.

For the platform rationale, use Apple's [motion guidance](https://developer.apple.com/design/human-interface-guidelines/motion).
