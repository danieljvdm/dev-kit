# Expo and React Native motion

Use this reference when implementing or reviewing animation in an Expo or React
Native app. Inspect the installed Expo SDK, animation packages, navigation
setup, and existing motion tokens before choosing APIs. Package and gesture
APIs vary by version; install compatible packages through Expo's installer when
the project uses Expo. Common tools are `react-native-reanimated`,
`react-native-worklets`, `react-native-gesture-handler`, and `expo-haptics`.

## Decide what should move

Name the transition's purpose: feedback, state indication, spatial continuity,
or explanation. Keep frequently repeated actions restrained. Use the project's
native navigation and controls where they already express the transition:
stack navigation, screen-sized sheets, tabs, and pull to refresh usually have
platform behavior worth preserving. Build a custom gesture when the interaction
really belongs inside a screen or needs behavior the native control cannot give.
In an Expo Router app, check native stack and sheet options before building a
screen transition in JavaScript.

## Choose the animation path

- A simple state change can use the project's supported Reanimated transition
  or layout animation. Continuous drag and scroll motion should use shared
  values, animated styles, and a gesture handler on the UI runtime.
- For UI that follows the software keyboard, use its actual frame progress
  through a supported native controller rather than starting a guessed timing
  animation from a JavaScript keyboard event.
- Do not drive gesture or scroll frames through React state or schedule a call
  to the React Native runtime every frame. Cross runtimes at a commit, end, or
  meaningful threshold. Read and write shared values in supported handlers,
  worklets, or effects rather than during render.
- Prefer transforms and opacity for moving surfaces. Layout properties can
  trigger work for siblings on every frame; measure when a layout animation is
  necessary. Crossfade static blur or shadow layers instead of animating an
  expensive blur or Android elevation value. Avoid mount animations on
  virtualized list rows, which may replay as rows are recycled.
- For a gesture, start from the element's current visible position. Preserve
  the release velocity when settling with a spring, and consider both travel
  and velocity when deciding whether to dismiss or snap back. Keep horizontal
  gestures from stealing a vertical list's scroll. Handle cancellation and
  interruption as well as a clean release.
- Use the project's existing timing and spring choices when they work. A spring
  suits a gesture handoff or retargeting; timing suits a state change without
  carried velocity. Avoid adding bounce where it obscures a hard boundary.

## Press, haptics, and accessibility

- Show press feedback on press-in and commit the action on press-out. Give small
  controls an adequate touch target with `hitSlop` and allow slight finger drift
  with `pressRetentionOffset` where appropriate.
- Use haptics for meaningful user actions or detents, synchronized with the
  visual response. Avoid a haptic every frame or as the only state feedback.
- Honor the system reduced-motion preference: simplify travel, parallax, and
  overshoot while retaining useful state feedback. Account for font scaling;
  measured heights at the default text size may not fit larger text.

## Verify on a device

Exercise fast and slow gestures, reversal, a grab during settling, repeated
presses, and reduced motion. Check keyboard-following UI against the actual
keyboard movement. Judge feel and frame stability in a release build on a real,
preferably slower supported device when available. State when verification was
limited to code, Expo Go, a development build, or a simulator. If a worklet or
gesture does not run, check the project version's setup requirements, including
its worklets configuration and gesture-handler root.
