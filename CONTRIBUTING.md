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
