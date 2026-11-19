# External code study: pinned E0 signals (2026-11-19)

This is a **read-only syntactic study**, NOT a claim of an external software defect or a security vulnerability. The cited repository revisions are fixed, and their cited source code was inspected through GitHub. No project-supplied scripts were executed.

## Case A — bounded GP001 false-positive reduction

- Repository: [ReactiveCircus/android-emulator-runner](https://github.com/ReactiveCircus/android-emulator-runner) (Apache-2.0)
- Pinned commit: [`ed009f5318f15b1cf93a191b856c4f1748a2d4c1`](https://github.com/ReactiveCircus/android-emulator-runner/commit/ed009f5318f15b1cf93a191b856c4f1748a2d4c1)
- File: [`src/main.ts`](https://github.com/ReactiveCircus/android-emulator-runner/blob/ed009f5318f15b1cf93a191b856c4f1748a2d4c1/src/main.ts)
- Observed call sites: lines [176](https://github.com/ReactiveCircus/android-emulator-runner/blob/ed009f5318f15b1cf93a191b856c4f1748a2d4c1/src/main.ts#L176) and [184](https://github.com/ReactiveCircus/android-emulator-runner/blob/ed009f5318f15b1cf93a191b856c4f1748a2d4c1/src/main.ts#L184).

Both callbacks are written `async` but only log values synchronously; their bodies have neither `await`, `throw` nor explicit returned values. v0.3's GP001 syntactic predicate would flag the two call sites as E0 candidates, though their code does not exhibit the usual callback-awaiting hazard. v0.4 suppresses this **narrow** no-await/no-return/no-throw shape. A minimized syntax fixture based on these sites is in `tests/scanner.test.mjs`.

This is a precision example, not a measured false-positive rate: no whole-repository benchmark or runtime contract reproduction has been performed here. Some no-await callbacks that start detached asynchronous work can be missed by the new guard; it is intentionally bounded and documented.

To rerun a pinned source-only scan yourself (without installing or executing the target repository):

```bash
# Run from the ghostproof checkout; use an otherwise unused local directory.
git clone https://github.com/ReactiveCircus/android-emulator-runner.git /tmp/ghostproof-android-emulator-runner
git -C /tmp/ghostproof-android-emulator-runner checkout --detach ed009f5318f15b1cf93a191b856c4f1748a2d4c1
git -C /tmp/ghostproof-android-emulator-runner rev-parse HEAD
node ./bin/ghostproof.mjs scan /tmp/ghostproof-android-emulator-runner/src/main.ts --format json
```

Check the reported `diagnostics` / `skippedParseErrors` before interpreting any zero-finding result. These commands clone the repository but do not run its source, tests, build, or install scripts.

## Case B — GP002 real-world positive E0 examples

- Repository: [mbnuqw/sidebery](https://github.com/mbnuqw/sidebery) (MIT)
- Pinned commit: [`aec831a48883597fa56e8511822d81bb14096e22`](https://github.com/mbnuqw/sidebery/commit/aec831a48883597fa56e8511822d81bb14096e22)
- File: [`src/utils.ts`](https://github.com/mbnuqw/sidebery/blob/aec831a48883597fa56e8511822d81bb14096e22/src/utils.ts)
- Source-reviewed `new Promise(async ...)` sites: lines [814](https://github.com/mbnuqw/sidebery/blob/aec831a48883597fa56e8511822d81bb14096e22/src/utils.ts#L814) and [1071](https://github.com/mbnuqw/sidebery/blob/aec831a48883597fa56e8511822d81bb14096e22/src/utils.ts#L1071).

These match the GP002 AST signature. The first executor contains an `await fetch(...)` and the second contains `await conf.action(...)`; the language mechanism is relevant. **This is E0 syntax evidence only, not an E2 project bug**: the implementation's error handling and application-level contract have not been validated. In particular, do not report these as vulnerabilities without a separate reproduction and a coordinated disclosure decision.

Reproduce the read-only E0 analysis:

```bash
git clone https://github.com/mbnuqw/sidebery.git /tmp/ghostproof-sidebery
git -C /tmp/ghostproof-sidebery checkout --detach aec831a48883597fa56e8511822d81bb14096e22
git -C /tmp/ghostproof-sidebery rev-parse HEAD
node ./bin/ghostproof.mjs scan /tmp/ghostproof-sidebery/src/utils.ts --format json
```

## Integrity and provenance boundaries

- Source line and commit SHA references were read directly from the public GitHub repositories. Full-file scans of those repositories have **not yet been executed or measured in this environment**. The snippets are used to inform minimized AST test cases.
- The cloned checkout's SHA must match the pinned value; save the command output as external evidence if conducting a formal study.
- E0 is static syntax, E1 is an isolated language mechanism, E2 needs project-specific contract failure, and E3 needs the same test red-before/green-after. **No automatic promotion is allowed**.
- The bundled verifier verifies only the repository-owned `BW001` demonstration, not these external projects.
