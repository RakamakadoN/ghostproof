# Ghostproof proof protocol v0.2

This protocol prevents false confidence. A static hit is an observation, not a confirmed defect.

| Level | Label | Minimum evidence | v0.2 support |
| --- | --- | --- | --- |
| **E0** | Candidate | AST signal, source file, position, rule ID and review guidance | **Implemented** |
| **E1** | Mechanism reproduction | A bounded isolated experiment demonstrates a language/runtime mechanism; this **does not imply an actual project bug** | **Implemented for two built-in fixtures** |
| **E2** | Project reproduction | A minimized test against a real affected project shows the failure in that context | Roadmap |
| **E3** | Regression guarded | Test fails before the fix and passes after it; controls and versions documented | Roadmap |

## Core invariants

1. Never describe an E0 hit as a confirmed bug.
2. An E1 demonstration cannot automatically promote a *specific E0 candidate* to E2.
3. E1 experiments may execute **only the bundled fixture programs**; the target repository is never imported, built or run by default.
4. A real project reproduction requires explicit permission, isolation and bounded resources before implementing E2.
5. An E3 claim requires both a failing test before the fix and a passing test after the fix, with an equivalent test environment.
6. Findings, fingerprints, experiment outcome and scope should remain separately inspectable.
7. No sensitive source code, access tokens or confidential vulnerability evidence goes into public test fixtures.

## Evidence boundaries in v0.2

- `ghostproof scan <path>` builds a TypeScript AST and identifies **E0 candidates only**, returning `summary.confirmed = 0`.
- `ghostproof experiment GP001|GP002|--all` executes **repository-owned** scripts only, in separate bounded Node subprocesses. Passing this command establishes an **E1 mechanism demonstration** for this Node runtime, not a fault in the scanned application.
- Neither command generates project-specific tests or performs E2/E3 verification.

## Rule caveats

**GP001**: `forEach` need not be `Array.prototype.forEach` (static syntax cannot prove receiver type); async callbacks may be deliberately fire-and-forget.

**GP002**: the name `Promise` may refer to a shadowed constructor. A static match does not prove a rejection occurs at runtime.

## Reporting templates for later E2/E3 implementations

When E2 support exists, reports should record: environment, exact revision, a minimal deterministic reproduction, expected vs actual behavior, error traces and test results. E3 should record the failing pre-fix and passing post-fix revisions. Until such machinery ships, **do not assert those outcomes**.
