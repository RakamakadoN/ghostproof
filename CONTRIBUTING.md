# Contributing to Ghostproof

Thank you for helping improve reproducible code analysis.

## Development

Node.js 20+ is required. No dependencies are needed for the current CLI.

```bash
npm test
npm run demo
```

## Rules

A new rule must include:

1. A concise behavioral hypothesis and remediation guidance.
2. Positive and negative fixtures in `tests/` to bound false positives.
3. Clear E0 labeling until project-specific failure is reproduced.
4. An explicit note about unsupported syntax or situations.

Do not copy private bug reports, proprietary code, unreleased vulnerabilities, or credentials into fixtures, issues, or PRs.

## Pull requests

Keep changes focused. Explain expected behavior, test commands, limitations, and any new privacy/security implications. Do not run untrusted target code in CI.
