# Proof protocol

Ghostproof follows an explicit evidence ladder. A static signal is not a defect confirmation.

| Level | Label | Minimum evidence |
| --- | --- | --- |
| **E0** | Candidate | Bounded static signal with file, location, and rule; no behavioral claim |
| **E1** | Mechanism reproduction | A safe isolated test demonstrates the suspected language/runtime mechanism, **not necessarily a project bug** |
| **E2** | Project reproduction | A minimally scoped test against the affected project demonstrates the real failure, with a deterministic expected/actual result |
| **E3** | Regression guarded | A regression test fails on the vulnerable revision and passes after the relevant fix |

## Invariants

1. Never call an E0 hit a confirmed bug.
2. Never equate a generic language-semantics demonstration with E2 reproduction.
3. Do not execute target project code by default. Future execution must be explicit, bounded, and appropriately sandboxed.
4. Do not leak private source, credentials, or confidential vulnerability details in reports.
5. Keep source anchors, rule ID, test steps, runtime versions, and expected/actual results together.
6. An E3 claim requires a negative control (test fails before the fix) and positive control (test passes after the fix).

## First release

The v0.1 CLI implements E0 only and deliberately reports `confirmed: 0`.
The built-in tests verify scanner behavior, not defects in third-party projects.

The E1–E3 pipeline is a planned extension, not a shipped feature.
