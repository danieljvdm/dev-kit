# Apple snapshots

Inspect the existing image generator, Xcode host and test targets, output path,
and CI. Preserve a named or working generator. SnapshotPreviews requires a host
app and hosted XCTest target; these requirements do not apply to every generator.
Resolve missing targets only when they are needed by the selected workflow.

- New SnapshotPreviews setup: [wizard setup](wizard-setup.md).
- Existing SnapshotPreviews or selective rendering: [rendering](snapshot-previews.md).
- Upload images from any generator: [uploads](snapshots.md).
- One-destination SnapshotPreviews CI: [simple CI](github-actions-simple.md).
- Multiple destinations or selective SnapshotPreviews CI: [fanout](github-actions-fanout.md).
- Point-Free snapshot testing CI: [existing generator](github-actions-swift-snapshot-testing.md).

Configure only the requested generation or upload path. Follow repository test
policy; ordinary telemetry setup does not authorize adding snapshot tests. Inspect
the produced images and manifest, then verify the authorized upload. Preserve a
full base manifest when using selective PR uploads. Report an unavailable host,
credential, or CI run without claiming deployed verification.
