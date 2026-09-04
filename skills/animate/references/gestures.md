# Gesture continuity

During direct manipulation, track the pointer from the original grab offset.
Use pointer capture where appropriate, distinguish the active pointer, and
handle cancellation as well as release. Preserve the platform's scrolling and
keyboard alternatives.

Separate the input-following phase from the settling phase. On release, carry
the measured velocity into the library's spring or momentum model. On an
interruption, retarget from the current visible position and velocity. Verify
the library's units; do not copy a velocity threshold without its units and
sampling assumptions.

Use distance and velocity together for dismissal or snapping, tuned to the
surface size and expected gesture. A short fast flick and a long slow drag may
both be intentional. Apply resistance near boundaries when it clarifies the
limit, while keeping ordinary movement one-to-one.

Exercise fast reversals, slow drags, release near a threshold, cancellation,
multiple pointers, and reduced motion when relevant to the changed behavior.
Use the target device to judge touch feel; state when only mouse behavior was
verified. Favor existing platform or library gesture handling over recreating it.

Use spatially coherent paths and origins. Directional hints should point toward
the action they teach. Add sound or haptics only when useful and supported by the
target platform. Apple's [motion guidance](https://developer.apple.com/design/human-interface-guidelines/motion)
provides the platform rationale.
