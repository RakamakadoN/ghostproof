# Before/after contract benchmark

The baseline is Ghostproof's own commit `4f90aba66c4f0befbea7294be1bcb79d7e99a929`, before PR #8. CI checks out that exact revision separately, installs its locked dependencies without lifecycle scripts, and compares both versions in the same Node 22 job using repository-authored synthetic inputs.

The measures are eight E0 syntax-contract examples, 28 invalid limit cases (seven values × two options × two target types), and four valid scan cases. A rejection is counted only if it matches the documented RangeError contract; a successful scan must have correct coverage and no candidates on the clean fixture. The comparison checks retained behavior and improved input validation. It does not measure project defect detection, independent real-world precision/recall, security impact, or performance gain.

The first measured result is pending CI. The cases were selected by the implementer from documented requirements, so this is a reproducible **comparative regression benchmark**, not a blinded independent study. No external code is executed.
