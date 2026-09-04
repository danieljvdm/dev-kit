# Implement motion

Identify the state transition, trigger, and purpose. Inspect the component's
current motion and tokens before changing it. Reuse the library already in use;
a simple hover, press, or fade often needs only a CSS transition.

For timing, properties, and reduced motion, consult [principles](principles.md).
For direct manipulation, consult [gestures](gestures.md).

Keep controls usable during transitions. Entering and exiting content must have
correct focus and pointer behavior. A rapid toggle or repeated notification
should continue from its visible state instead of jumping to an old endpoint.

Exercise the real interaction at normal speed, with repeated or interrupted
input, and with reduced motion. Use slow playback to inspect a suspected jump.
For gestures, verify on the relevant input device when available. Run the
repository's required checks; follow its policy for committed tests.

If the user requests a plan instead, give the affected files, intended behavior,
relevant constraints, and how to verify it. Include exact values when settled,
or the decision the implementer still needs to make. Adapt detail to the task
and executor. Store plans where repository policy permits.
