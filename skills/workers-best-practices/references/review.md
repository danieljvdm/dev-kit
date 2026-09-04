# Review and verification

Trace the changed request or event path, the capabilities it uses, and its
failure and cancellation behavior. Check configuration only where it affects
that path. Cite the concrete failure or risk in each finding; unrelated
hardening is not a prerequisite for completing the requested change.

Inspect surrounding code when needed to establish ownership. For uncertain API
behavior, consult installed declarations and the relevant official documentation
before reporting a violation.

Run the repository's required commands. Exercise the affected handler with its
actual runtime or the project's existing integration setup when needed.
Use the repository's testing policy to decide whether to add a regression test;
a new Worker does not imply a new test suite.

Report what ran, the observable result, and any runtime behavior left unverified.
Keep an audit read-only unless fixes are also requested.
