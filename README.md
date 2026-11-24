<div align="center">

# GHOSTPROOF

### Your AI wrote the code. Check what it broke.

**Evidence-first AST analysis, controlled runtime experiments and verifiable bundled evidence for JavaScript and TypeScript.**

[![CI](https://github.com/RakamakadoN/ghostproof/actions/workflows/ci.yml/badge.svg)](https://github.com/RakamakadoN/ghostproof/actions/workflows/ci.yml)
![Node 20+](https://img.shields.io/badge/Node.js-20%2B-339933)
![MIT](https://img.shields.io/badge/license-MIT-blue)
![Preview](https://img.shields.io/badge/status-v0.6%20preview-orange)

</div>

> **Early preview v0.6.** Scans of your code return **E0 candidates**, not confirmed bugs. E1 runs two repository-owned mechanism fixtures. The new `proof BW001` command demonstrates E2/E3 red/green evidence on an intentionally defective **bundled sample project** only. No arbitrary external-project E2/E3 verification is shipped.

## Quick start

Requires Node.js 20+. No account or API key.

```bash
git clone https://github.com/RakamakadoN/ghostproof.git
cd ghostproof
npm ci --ignore-scripts
npm test
npm run demo
npm run experiment
npm run proof
```

Demo summary:

```text
Ghostproof 0.6 [TypeScript AST] | 2 files scanned | 2 E0 candidates | 0 confirmed
```

Local scan of your project:

```bash
node ./bin/ghostproof.mjs scan /path/to/project
node ./bin/ghostproof.mjs scan /path/to/project --format json
node ./bin/ghostproof.mjs check /path/to/project --fail-on candidates
```

`scan` and `check` accept `--fail-on none|candidates`, `--max-files N` and `--max-bytes N`. These three options are scan-only, even when explicitly set to their defaults. `--format text|json` is available on all commands. `--output PATH` is proof-only.

Built-in controlled E1 experiments (no target code executed):

```bash
node ./bin/ghostproof.mjs experiment GP001
node ./bin/ghostproof.mjs experiment GP002 --format json
node ./bin/ghostproof.mjs experiment --all
```

Verify a previously created **v0.3 BW001** JSON report with Ghostproof v0.6:

```bash
node ./bin/ghostproof.mjs proof BW001 --output ./bw001-evidence.json
node ./bin/ghostproof.mjs verify ./bw001-evidence.json
node ./bin/ghostproof.mjs verify ./bw001-evidence.json --format json
```

The verifier checks pinned fixture SHA-256 hashes **before** executing the bundled sample and then compares the entire supplied report to a fresh deterministic replay. It rejects altered reports, symlinks and files over 512 KiB. It does not execute commands or paths supplied inside the JSON. This is **not** a cryptographic signature, proof of authorship, or verification of external projects.

`npm link` adds a local `ghostproof` command. This package is **not published to npm** yet; `npx ghostproof` is not supported.

## Agent Skill for Codex and Claude Code

Ghostproof also ships a portable **Agent Skills** instruction layer; it tells assistants when and how to use this CLI safely. The CLI remains the execution engine. Repository-local entrypoints:

- [Codex: `.agents/skills/ghostproof/SKILL.md`](.agents/skills/ghostproof/SKILL.md)
- [Claude Code: `.claude/skills/ghostproof/SKILL.md`](.claude/skills/ghostproof/SKILL.md)

To use Ghostproof from other repositories, follow [Agent Skill installation and examples](docs/AGENT_SKILL.md). The skill does not install dependencies, auto-run third-party code, or turn E0 into project proof.

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

This pattern is **not automatically a bug**: asynchronous work may intentionally be detached. E0 means "investigate", not "confirmed". In v0.4, GP001 suppresses async block callbacks without an `await`, explicit returned value, or `throw` (for example, blocks that only call `console.log`). It can miss some callbacks that launch detached async work. See [the pinned external E0 study](docs/EXTERNAL_E0_STUDY.md).

## Evidence ladder

- **E0** — candidate: source location, AST signal, rule ID, explanation and fingerprint (**implemented**).
- **E1** — isolated runtime mechanism observed in a repository-owned fixture (**implemented for GP001/GP002**).
- **E2** — the bundled `BW001` sample violates a documented completion contract (external projects: **roadmap**).
- **E3** — one unchanged bundled sample test fails before and passes after a fix (external projects: **roadmap**).

See [Proof Protocol](docs/PROOF_PROTOCOL.md). An E1 demonstration never automatically promotes a project E0 finding to E2.

## E2/E3 sample project proof

```bash
node ./bin/ghostproof.mjs proof BW001
node ./bin/ghostproof.mjs proof BW001 --format json
node ./bin/ghostproof.mjs proof BW001 --output ./evidence.json
```

`BW001` uses a repository-owned batch-writer sample with a known completion contract. The pre-fix variant returns early; the post-fix variant waits for all records. The **same contract test** checks both. JSON includes expected/actual results, SHA-256 hashes of test and variants, and Node/runtime metadata. Evidence format remains **v0.3** for backwards compatibility; v0.4 adds a separate `verify` command and v0.4 verification-result format. `--output` writes JSON only to an explicitly selected path and refuses overwriting an existing file.

**Important:** this is an intentionally defective *sample*, not verification of bugs in a third-party repository. The `proof` command rejects arbitrary paths and runs only allowlisted code.

## How it works

The TypeScript compiler AST parser (`typescript@5.8.3`) scans `.js`, `.jsx`, `.mjs`, `.cjs`, `.ts`, `.tsx` syntax. It avoids interpreting comments, strings, regex literals or JSX strings as code. It does **not** type-check receiver types or prove control-flow faults.

The JSON scan report includes parser identity, findings, fingerprints, file-count and parse diagnostic coverage. See the [pinned external-source E0 review](docs/EXTERNAL_E0_STUDY.md) for a GP001 false-positive reduction and GP002 candidates in real public sources (no external executions or E2 claims). Syntax-invalid sources are skipped with diagnostics.

## Safety and limitations

- Read-only scanning: target files are not imported, built, compiled or executed.
- `experiment` executes only built-in GP001/GP002 fixtures; `proof` executes only the bundled BW001 project test in bounded subprocesses; `verify` reads user-selected JSON but executes only trusted, pinned BW001 fixtures; arbitrary target executable paths are rejected.
- No telemetry, cloud API calls, automatic fixes, or generated regression tests for external projects.
- Custom `.forEach` methods, intentionally detached async callbacks, shadowed `Promise` names and other context can produce E0 signals without real project defects.
- Symlinks, common dependency directories and files over 512 KiB are skipped; max 2,000 eligible files by default. Not a hostile-filesystem sandbox.
- Exit `0`: success; `1`: optional candidate gate or unsuccessful bundled experiment, proof or evidence verification; `2`: invalid arguments or an error reported by the CLI.
- A clean scan does **not** certify safety or absence of defects.

## v0.6 engineering validation

See [changelog](CHANGELOG.md), [performance baseline](docs/PERFORMANCE.md), [platform smoke scope](docs/PLATFORM_COMPATIBILITY.md), and [comparative contract benchmark](docs/COMPARATIVE_BENCHMARK.md). The selected synthetic contract comparison improved from 12/40 to 40/40; this is not real-world detector accuracy. The evidence schemas remain unchanged.

## Developer usability pilot

The [developer evaluation protocol](docs/DEVELOPER_PILOT.md) and [participant worksheet](docs/DEVELOPER_PILOT_WORKSHEET.md) define a voluntary comparison of manual review and Ghostproof-assisted review. No participant outcomes have been collected yet. Use only owned or explicitly shareable inputs; do not publish private code or candidate findings.

## Roadmap

1. Expanded, independently measured precision/recall benchmarks (the v0.4 pinned examples are an initial study, not quantified benchmark coverage).
2. Bounded opt-in reproduction of real, external project failures (E2); not shipped.
3. Automated red/green testing of external projects (E3); bundled sample is available.
4. GitHub Action and agent integrations.
5. Python support.

Read [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md). Private research repositories and undisclosed findings are not imported into this public project.

## v0.5 pinned public E0 and agent-host smoke

```bash
npm run smoke:skills
node ./bin/ghostproof.mjs study --format json
```

The first command checks installed local Agent Skill files; actual model recognition requires explicit invocation in Codex or Claude Code. The second scans exactly two publicly available TypeScript files at fixed commits, verifies Git blob hashes, and emits E0 candidates without running downloaded code. It requires network access and is not a full repository audit. See [pinned E0 study](docs/PINNED_STUDY.md).

## License

[MIT](LICENSE) © Ghostproof contributors.
