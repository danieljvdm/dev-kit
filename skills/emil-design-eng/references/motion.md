# Motion decisions

Identify what the transition communicates and how often it appears. Keep
frequent actions responsive and let informational content stay readable.
Motion can preserve a spatial relationship or acknowledge an action; omit it
when it only adds delay or distraction.

Choose origin, travel, and timing together. A popover can grow from its trigger;
a centered dialog can stay centered. Use existing tokens as the initial values
and tune against the actual component. Retarget interrupted motion from its
visible state.

For implementation, detailed review, or an opportunity search, use `animate`
when available. Otherwise consult the installed animation library and
[Emil's animation guidance](https://emilkowal.ski/ui/you-dont-need-animations).
Preserve reduced-motion behavior and keyboard accessibility.

Measure suspected rendering cost. A property's name, a library shorthand, or a
duration threshold alone does not establish a performance regression. Keep
visual judgment separate from verified correctness or performance findings.
