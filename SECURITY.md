# Security policy

Ghostproof v0.2 is a preview, not a complete security audit.

## Threat boundary

- `scan` reads eligible JavaScript/TypeScript files but never executes, imports or compiles them.
- `experiment` only runs two bundled, controlled fixture IDs in bounded Node subprocesses; paths supplied by the user cannot be executed.
- E0 static findings and E1 isolated mechanisms do **not** confirm third-party vulnerabilities.
- Parser and runtime dependencies should come from trusted sources and the checked-in lockfile.
- File size limits, directory exclusions and skipped symlinks reduce risk but are not a filesystem sandbox. Do not run with elevated privileges on actively hostile or concurrently modified directory trees.

Please report vulnerabilities in Ghostproof privately using GitHub private vulnerability reporting, if enabled, or contact the maintainer privately. Never post confidential source, secrets or undisclosed exploits as public GitHub issues.

The `proof` command currently accepts only the explicitly bundled `BW001` sample. It must not execute arbitrary user-supplied repositories or paths. Evidence output is created only when `--output PATH` is supplied and refuses to overwrite existing files; review any evidence before sharing it. A subprocess timeout is **not** a general-purpose adversarial sandbox.
