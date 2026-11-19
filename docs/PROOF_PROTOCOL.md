# Ghostproof proof protocol v0.4 (with v0.3 bundle compatibility)

This protocol prevents false confidence. A static hit is an observation, not a confirmed defect.

| Level | Label | Minimum evidence | v0.3 support |
| --- | --- | --- | --- |
| **E0** | Candidate | AST signal, source file, position, rule ID and review guidance | **Implemented** |
| **E1** | Mechanism reproduction | A bounded isolated experiment demonstrates a language/runtime mechanism; this **does not imply an actual project bug** | **Implemented for two built-in fixtures** |
| **E2** | Project reproduction | A minimized project-specific test shows a contract violation | **Bundled BW001 sample only**; external projects roadmap |
| **E3** | Regression guarded | Same test fails before the fix and passes after it; controls and versions documented | **Bundled BW001 sample only**; external projects roadmap |

## Core invariants

1. Never describe an E0 hit as a confirmed bug.
2. An E1 demonstration cannot automatically promote a *specific E0 candidate* to E2.
3. E1 experiments and bundled E2/E3 demos execute **only allowlisted repository-owned fixtures**; scanned target repositories are never imported, built or run by default.
4. A real project reproduction requires explicit permission, isolation and bounded resources before implementing E2.
5. An E3 claim requires both a failing test before the fix and a passing test after the fix, with an equivalent test environment.
6. Findings, fingerprints, experiment outcome and scope should remain separately inspectable.
7. No sensitive source code, access tokens or confidential vulnerability evidence goes into public test fixtures.

## Evidence boundaries in v0.3

- `ghostproof scan <path>` builds a TypeScript AST and identifies **E0 candidates only**, returning `summary.confirmed = 0`.
- `ghostproof experiment GP001|GP002|--all` executes **repository-owned** scripts only, in separate bounded Node subprocesses. Passing this command establishes an **E1 mechanism demonstration** for this Node runtime, not a fault in the scanned application.
- `ghostproof proof BW001` uses an **unchanged contract test** on an intentionally defective bundled batch-writer (`before.mjs`) and a correction (`after.mjs`). SHA-256 hashes for before/after/test and expected/actual observations form a reproducible evidence bundle. This is **not evidence about an external repository**. The command refuses caller-provided program paths and `--output` never overwrites an existing file.
- There is **no automated E2/E3 verification for arbitrary real-world targets**. Importing a scan finding never promotes its evidence level.

## Rule caveats

**GP001**: `forEach` need not be `Array.prototype.forEach` (static syntax cannot prove receiver type); async callbacks may be deliberately fire-and-forget.

**GP002**: the name `Promise` may refer to a shadowed constructor. A static match does not prove a rejection occurs at runtime.

## Reporting templates for external E2/E3 implementations

When external-project E2 support exists, reports should record: environment, exact revision, a minimal deterministic reproduction, expected vs actual behavior, error traces and test results. E3 should record the failing pre-fix and passing post-fix revisions. Until such machinery ships, **do not assert those outcomes**.

## v0.4 BW001 report verification

`ghostproof verify path/to/bw001-evidence.json` performs an **allowlisted re-execution** of the bundled BW001 experiment and compares the full record to the supplied v0.3 JSON report. The built-in fixture file SHA-256 hashes are pinned in code and verified **before** any replay. The JSON file is read as data, never as executable instructions; arbitrary report-supplied paths are ignored. Valid structured results return exit `0`, altered evidence returns `1`, and malformed, oversized or symlinked input returns `2`.

This adds a deterministic consistency and provenance check for the **bundled fixture shipped with Ghostproof**. It does NOT authenticate the report's author, prove an external project's failure, validate arbitrary imported E2/E3 evidence, or substitute for cryptographic signing.

### External pinned E0 study

See [EXTERNAL_E0_STUDY.md](EXTERNAL_E0_STUDY.md) for public commit-pinned source references and a deliberately bounded GP001 precision test. Neither referenced external project has been executed or confirmed to contain a defect in this research.
