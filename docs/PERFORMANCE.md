# Scanner performance baseline

Run from an installed Ghostproof checkout:

```sh
node --test tests/performance.test.mjs
```

The test creates 50, 200 and 1,000 small repository-generated JavaScript files in temporary directories. The files are read and parsed, not executed. A small warmup precedes three full scans per size. Fixture creation is excluded from elapsed time. The test validates the expected coverage and zero E0 candidates for these deliberately clean inputs.

TAP diagnostics record Node version, operating system, CPU, input bytes, individual elapsed times, median elapsed time, derived files per second and resident memory before/after each scan. RSS values are process-wide snapshots, **not peak memory or memory attributed exclusively to the scanner**. Shared CI runners, filesystem caches and garbage collection introduce variance. Timings are informational rather than flaky pass/fail thresholds.

This is a synthetic clean-source baseline, not a whole-project performance guarantee or a measure of detector accuracy. No optimization is claimed; compare equivalent runs on the same environment before changing implementation. All temporary fixtures are removed.

The baseline is included in the existing Node test suite. Initial measured results must be collected from completed CI logs; this document does not invent measurements.
