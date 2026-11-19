<div align="center">

# GHOSTPROOF

### Your AI wrote the code. Check what it broke.

**Evidence-first AST analysis and controlled runtime experiments for JavaScript and TypeScript.**

[![CI](https://github.com/RakamakadoN/ghostproof/actions/workflows/ci.yml/badge.svg)](https://github.com/RakamakadoN/ghostproof/actions/workflows/ci.yml)
![Node 20+](https://img.shields.io/badge/Node.js-20%2B-339933)
![MIT](https://img.shields.io/badge/license-MIT-blue)
![Preview](https://img.shields.io/badge/status-v0.2%20preview-orange)

</div>

> **Early preview v0.2.** Scan results are **E0 candidates**, not confirmed project bugs. Two bundled E1 experiments demonstrate language/runtime mechanisms, not real project defects. E2/E3 verification is planned, not shipped.

## Quick start

Requires Node.js 20+. No account or API key.

```bash
git clone https://github.com/RakamakadoN/ghostproof.git
cd ghostproof
npm ci --ignore-scripts
npm test
npm run demo
npm run experiment
```

Demo summary:

```text
Ghostproof 0.2 [TypeScript AST] | 2 files scanned | 2 E0 candidates | 0 confirmed
```

Local scan of your project:

```bash
node ./bin/ghostproof.mjs scan /path/to/project
node ./bin/ghostproof.mjs scan /path/to/project --format json
node ./bin/ghostproof.mjs check /path/to/project --fail-on candidates
```

Built-in controlled E1 experiments (no target code executed):

```bash
node ./bin/ghostproof.mjs experiment GP001
node ./bin/ghostproof.mjs experiment GP002 --format json
node ./bin/ghostproof.mjs experiment --all
```

`npm link` adds a local `ghostproof` command. This package is **not published to npm** yet; `npx ghostproof` is not supported.

## Two bounded rules

| Rule | E0 AST signal | E1 built-in mechanism |
| --- | --- | --- |
| **GP001** | Async callback passed to `.forEach(...)` | `forEach` returns before async callbacks complete |
| **GP002** | `new Promise(async ...)` executor | A rejection after `await` may leave the outer promise pending |

Example:

```javascript
items.forEach(async item => {
  await save(item);
});
```

This pattern is **not automatically a bug**: asynchronous work may intentionally be detached. E0 means "investigate", not "confirmed".

## Evidence ladder

- **E0** — candidate: source location, AST signal, rule ID, explanation and fingerprint (**implemented**).
- **E1** — isolated runtime mechanism observed in a repository-owned fixture (**implemented for GP001/GP002**).
- **E2** — a real affected project fails in a reproducible test (**roadmap**).
- **E3** — a regression test fails before and passes after the actual fix (**roadmap**).

See [Proof Protocol](docs/PROOF_PROTOCOL.md). An E1 demonstration never automatically promotes a project E0 finding to E2.

## How it works

The TypeScript compiler AST parser (`typescript@5.8.3`) scans `.js`, `.jsx`, `.mjs`, `.cjs`, `.ts`, `.tsx` syntax. It avoids interpreting comments, strings, regex literals or JSX strings as code. It does **not** type-check receiver types or prove control-flow faults.

The JSON scan report includes parser identity, findings, fingerprints, file-count and parse diagnostic coverage. Syntax-invalid sources are skipped with diagnostics.

## Safety and limitations

- Read-only scanning: target files are not imported, built, compiled or executed.
- `experiment` executes **only** built-in fixture IDs GP001/GP002 in 2-second bounded subprocesses; arbitrary paths are rejected.
- No telemetry, cloud API calls, automatic fixes, or project-specific regression generation.
- Custom `.forEach` methods, intentionally detached async callbacks, shadowed `Promise` names and other context can produce E0 signals without real project defects.
- Symlinks, common dependency directories and files over 512 KiB are skipped; max 2,000 eligible files by default. Not a hostile-filesystem sandbox.
- Exit `0`: command completed; `1`: optional candidate gate or failed E1 demo; `2`: CLI/scan error.
- A clean scan does **not** certify safety or absence of defects.

## Roadmap

1. Additional AST rules with precision benchmarks.
2. Bounded project reproduction under explicit consent (E2).
3. Red/green project regression tests and verification (E3).
4. GitHub Action and agent integrations.
5. Python support.

Read [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md). Private research repositories and undisclosed findings are not imported into this public project.

## License

[MIT](LICENSE) © Ghostproof contributors.
