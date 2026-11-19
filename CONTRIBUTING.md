# Contributing to Ghostproof

Ghostproof favors reproducible evidence over unqualified claims of defect discovery.

## Development

```bash
npm ci --ignore-scripts
npm test
npm run demo
npm run experiment
```

Requires Node.js 20+. The TypeScript parser is pinned in `package-lock.json`.

## Adding a rule

Every AST rule needs a clear runtime hypothesis, a bounded predicate, guidance, and positive/negative tests. Include comments, strings, regex, JSX, TypeScript, and potential false-positive cases as relevant. Label static matches **E0 candidates**, never confirmed bugs.

## Adding an E1 experiment

Experiments must use **repository-owned, deterministic fixtures only**. They cannot execute arbitrary user-selected paths or import scanned projects. Tests must check the observed outcome and retain `projectBugConfirmed: false`.

Keep PRs focused and include tested commands and limitations. Do not commit private source, secrets, unpublished bug reports, or embargoed vulnerability details.

## Bundled project proof cases

A new `proof` case must have a documented project contract, deterministic before/after fixtures, the **same test** in both revisions, bounded subprocess execution, SHA-256 source metadata, negative controls, and no external code execution. The public fixture must be intentionally disclosed and not contain private customer code.

## v0.4 verification and external E0 research

The `verify` command accepts **only v0.3 BW001 bundled evidence**. Do not add external program execution or new evidence-level promotion without an explicit safety design and reviewed acceptance tests. When changing bundled fixtures, review and update pinned hashes, test controls, the supported schema, and migration notes together.

External snippets must cite the exact public commit, file and source lines, with license attribution. Start with read-only scanning. Do not publish undisclosed vulnerability allegations based only on an E0 signature.
