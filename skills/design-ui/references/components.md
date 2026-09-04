# Component details

## Feedback and continuity

Give a button clear pressed and pending states. Keep the control available
according to the action's actual lifecycle; decorative motion should not add
latency. Scale can provide press feedback when it does not compromise text or
hit targets.

For related tooltips in a toolbar, consider a shared delay policy: delay the
first discovery, then let nearby tooltips appear promptly as the user explores.
Keep hoverable surfaces reachable across small gaps and usable by keyboard.

For toasts and other transient content, consider pausing dismissal while the
user interacts or the page is hidden. Repeated additions and dismissals must
preserve readable order and stable pointer targets.

## Defaults and API design

Choose useful defaults before adding options. Expose variations that represent
real product needs. Keep the public API simple without concealing ownership or
introducing global state that conflicts with the application architecture.

Use realistic content to judge density, alignment, wrapping, and truncation.
Compare populated, empty, pending, error, and overflow states when they are
relevant to the component. Retain focus and selection through updates.

## Evaluate

Exercise the flow at normal speed before slow inspection. Compare against the
rest of the product. If two presentations are both viable and the user wants
exploration, use a small set of working prototypes with explicit tradeoffs.
Do not turn a small polish task into a mandatory redesign or multi-day review.
