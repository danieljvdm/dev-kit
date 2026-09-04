# Review motion

Scope the review to the requested diff, component, or application area. Identify
the product's timing tokens, interaction frequency, and intended behavior.
Use [principles](principles.md) and [gestures](gestures.md) for relevant decisions.

Report a finding when the evidence shows harm: delayed feedback, jumping on
interruption, broken focus, unnecessary movement, inconsistent spatial behavior,
or measured rendering cost. Explain the trigger and user-visible consequence.
A different easing preference or an arbitrary frequency threshold is not enough.

Prioritize functional and accessibility problems, then responsiveness and
cohesion. Cite locations and propose the smallest useful correction. A clean
review is valid. Use a table, prose, or a diff according to what explains the
findings clearly; give a blocking verdict only when the review calls for one.

When code alone cannot establish how something feels or performs, label the
uncertainty and identify a focused visual or performance check. Preserve
documented tradeoffs unless new evidence shows they no longer hold.
