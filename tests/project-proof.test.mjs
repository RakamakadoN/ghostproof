import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runProjectProof } from '../src/project-proof.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = (...args) => spawnSync(process.execPath, ['./bin/ghostproof.mjs', ...args], {
  cwd: root, encoding: 'utf8', timeout: 7000,
});

test('bundled BW001 reproduces project contract failure (E2) and same-test red-green (E3)', () => {
  const report = runProjectProof('BW001');
  assert.equal(report.schemaVersion, '0.3');
  assert.equal(report.passed, true);
  assert.equal(report.scope, 'bundled-sample-project-only');
  assert.equal(report.externalProjectBugConfirmed, false);
  assert.equal(report.ruleId, 'GP001');
  assert.equal(report.e0.beforeCandidates.length, 1);
  assert.equal(report.e0.beforeCandidates[0].level, 'E0');
  assert.equal(report.e0.afterCandidates.length, 0);
  assert.equal(report.e2.reproduced, true);
  assert.equal(report.e2.actual.settledBeforeSaveCompleted, true);
  assert.equal(report.e2.expected.settledBeforeSaveCompleted, false);
  assert.equal(report.e3.before.contractPassed, false);
  assert.equal(report.e3.after.contractPassed, true);
  assert.equal(report.e3.regressionGuarded, true);
  assert.equal(report.e3.sameTestSha256, report.project.sources['verify.mjs'].sha256);
  assert.match(report.project.sources['before.mjs'].sha256, /^[a-f0-9]{64}$/);
});

test('evidence report is repeatable independent of timestamps', () => {
  const first = runProjectProof('BW001');
  const second = runProjectProof('BW001');
  assert.deepEqual(first, second);
});

test('CLI supports JSON evidence for a bundled case', () => {
  const processResult = cli('proof', 'BW001', '--format', 'json');
  assert.equal(processResult.status, 0, processResult.stderr);
  const report = JSON.parse(processResult.stdout);
  assert.equal(report.e2.reproduced, true);
  assert.equal(report.e3.regressionGuarded, true);
});

test('proof refuses arbitrary executables, unknown case IDs and scan-only flags', () => {
  for (const args of [
    ['proof', '../arbitrary.mjs'],
    ['proof', '/tmp/evil.js'],
    ['proof', 'GP001'],
    ['proof', 'BW001', '--fail-on', 'candidates'],
    ['proof', 'BW001', '--max-files', '5'],
  ]) {
    const result = cli(...args);
    assert.equal(result.status, 2, `${args.join(' ')}: ${result.stderr}`);
  }
});

test('--output creates inspectable JSON only with explicit user path and does not overwrite', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ghostproof-evidence-'));
  try {
    const out = path.join(dir, 'bundle.json');
    const first = cli('proof', 'BW001', '--output', out);
    assert.equal(first.status, 0, first.stderr);
    const report = JSON.parse(await readFile(out, 'utf8'));
    assert.equal(report.passed, true);
    const second = cli('proof', 'BW001', '--output', out);
    assert.equal(second.status, 2);
    assert.match(second.stderr, /EEXIST/);
    assert.deepEqual(JSON.parse(await readFile(out, 'utf8')), report);
    const invalid = cli('scan', './examples', '--output', path.join(dir, 'unexpected.json'));
    assert.equal(invalid.status, 2);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
