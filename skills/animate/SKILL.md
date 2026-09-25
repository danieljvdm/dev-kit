---
name: animate
description: Implement, review, or improve UI motion for web and Expo/React Native, and identify animation terminology.
license: MIT
---

# Animate

Match the user's task. Implement requested changes; keep a review or opportunity
search read-only unless implementation is also requested. A broader audit or
written plan is optional, not a prerequisite to fixing one interaction.

For Expo or React Native animation, read [animate Expo](references/animate-expo.md).
It covers native motion tools, gestures, accessibility, and device verification.
For websites and PWAs, read only the web references needed for the work:

- Naming an effect described by the user: [animation vocabulary](references/glossary.md).
- Adding or fixing motion: [implementation](references/implementation.md).
- Reviewing a diff or auditing existing motion: [review](references/review.md).
- Finding places that would benefit from motion:
  [opportunities](references/opportunities.md).
- Easing, timing, performance, or accessibility decisions:
  [motion principles](references/principles.md).
- Gesture tracking, velocity, springs, or interruption:
  [gestures](references/gestures.md).
- Motion in a mobile website or PWA, especially press feedback, sheets, or
  carousels: [mobile native](references/mobile-native.md).

The mobile-native reference covers mobile websites and PWAs, not Expo apps.

Use the product's existing tokens and motion tools. Judge animation by its
purpose, response, accessibility, and observed behavior. Named curves, durations,
and patterns are starting points; they do not override a deliberate product
choice or evidence from the running interface.

Verify changed motion in the running UI when possible. Record any visual or
device behavior that could not be checked. Preserve useful evidence for review.

Dev Kit combines the upstream motion workflows and vocabulary here.
Attribution and fork details are in [NOTICE](NOTICE); terms are in [LICENSE](LICENSE).
