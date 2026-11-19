<div align="center">

# Ghostproof

### Your AI wrote the code. Check what it broke.

**Evidence-first detection of hidden bug candidates in AI-generated and human-written code.**

[![CI](https://github.com/RakamakadoN/ghostproof/actions/workflows/ci.yml/badge.svg)](https://github.com/RakamakadoN/ghostproof/actions/workflows/ci.yml)
![Node 20+](https://img.shields.io/badge/Node.js-20%2B-339933)
![MIT](https://img.shields.io/badge/license-MIT-blue)
![Early preview](https://img.shields.io/badge/status-early%20preview-orange)

</div>

> **Early preview (v0.1):** A working, read-only JavaScript/TypeScript heuristic scanner. It reports **E0 candidates**, not confirmed bugs. Reproducing failures and generating project-specific regression tests are *roadmap items*, not currently implemented.

## Why Ghostproof?

AI coding agents can produce convincing code while missing subtle runtime behavior. Traditional quality tools help, but developers still need a reproducible path from **suspicion → experiment → bug confirmation → regression test**.

Ghostproof is built around that evidence progression. The first release intentionally starts narrow rather than claiming that every suspicious pattern is a defect.

## Try it in 30 seconds

Requires Node.js 20 or later. No API key, account, install step, or dependency download is required.

```bash
git clone https://github.com/RakamakadoN/ghostproof.git
cd ghostproof
npm test
node ./bin/ghostproof.mjs scan ./examples
```

Expected summary:

```text
Ghostproof 0.1 | 2 files scanned | 2 E0 candidates | 0 confirmed
```

Scan your project:

```bash
node ./bin/ghostproof.mjs scan /path/to/your/project
node ./bin/ghostproof.mjs scan /path/to/your/project --format json
node ./bin/ghostproof.mjs check /path/to/your/project --fail-on candidates
```

You can also run `npm link` in the checkout to add the local `ghostproof` command. **The package is not yet published to npm**; `npx ghostproof` is not a supported install path.

Default exit behavior is non-breaking: `0` on a completed scan, even when candidates are found. Opt into exit `1` with `--fail-on candidates`; CLI/scan errors exit `2`.

## What it detects today

| Rule | Candidate | Why review it? |
| --- | --- | --- |
| `GP001` | Async callback passed to `forEach` | `forEach` does not wait for returned promises |
| `GP002` | Async `Promise` constructor executor | A throw after `await` may leave the outer Promise pending |

Example:

```js
items.forEach(async (item) => {
  await save(item);
});
```

This is **not automatically a bug**: detached async work may be intentional. Ghostproof returns a candidate with its source location and guidance to investigate whether the caller requires completion.

## Evidence, not confidence theater

- **E0 — candidate:** bounded static signal only (**supported now**).
- **E1 — mechanism reproduction:** demonstrate the runtime mechanism in isolation.
- **E2 — project reproduction:** demonstrate a real failure against the affected project.
- **E3 — regression guarded:** red-before / green-after test of the exact bug.

See [Proof Protocol](docs/PROOF_PROTOCOL.md). A scanner match never gets promoted beyond E0 without additional evidence.

## Scope and limitations

- Read-only; does not import, build, or execute source code being scanned.
- Supports `.js`, `.jsx`, `.mjs`, `.cjs`, `.ts`, `.tsx` with **heuristics, not full AST parsing**.
- Masks common comments and string/template contents; regex literals, JSX, dynamic syntax, and complex callback types can cause false positives or misses.
- Skips symlinks, common dependency/build folders, and files above 512 KiB by default. Maximum 2,000 source files by default. Raises an error rather than silently truncating at the file-count limit.
- JSON output includes file locations, stable fingerprints, E0 labels, scan coverage, and `confirmed: 0`.
- No cloud calls, telemetry, LLM inference, autofix, or project-specific regression generation.
- **Security-sensitive or private code:** use local scans only and review artifacts before sharing.

## Roadmap

1. Parser-backed JS/TS analysis with measured precision and false-positive rates.
2. Bounded isolated behavioral reproductions with explicit opt-in.
3. E2/E3 project-specific tests and mutation-aware verification.
4. Python support, GitHub Actions integration, and optional CI annotations.
5. Optional interfaces for agent systems and Git history analysis.

## Contributing

Start with [CONTRIBUTING.md](CONTRIBUTING.md). Please provide a minimal positive and negative fixture for every new rule; never label a static pattern a confirmed production defect.

## Security

See [SECURITY.md](SECURITY.md). Please disclose exploitable vulnerabilities privately, not in public issues.

## Provenance

Ghostproof is a separate public product; private research repositories and evidence are **not** imported into this project by default. This repository contains only material intentionally published for its users.

## License

[MIT](LICENSE) © Ghostproof contributors.
