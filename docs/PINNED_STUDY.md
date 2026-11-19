# GHOSTPROOF v0.5 — pinned public E0 study

A reproducible read-only analysis of exactly two real open-source TypeScript files. No downloaded code is executed, imported, built or installed.

| Repository | Pinned commit | Source | Git blob SHA-1 |
| --- | --- | --- | --- |
| ReactiveCircus/android-emulator-runner | ed009f5318f15b1cf93a191b856c4f1748a2d4c1 | src/main.ts | a6c787e7489260719e28e56710fe899c404ba92c |
| mbnuqw/sidebery | aec831a48883597fa56e8511822d81bb14096e22 | src/utils.ts | 61c15e738dbe06990a55f6d7708d36bc73006e66 |

The first file contains async forEach logging callbacks that make a useful negative precision control. The second contains async Promise executors that need context-dependent review. Neither represents a confirmed project defect.

Use this command in the trusted Ghostproof checkout:

`node ./bin/ghostproof.mjs study --format json`

The report contains immutable commit IDs, verified Git blob hashes, source SHA-256, AST locations, and E0 candidate findings. It covers **two files**, not whole repositories. Fetch limits: 512 KiB per file, 12-second timeout, no redirects. If download, identity, or parsing fails, it does not publish an E0 result.
