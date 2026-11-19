import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = (...args) => spawnSync(process.execPath, ['./bin/ghostproof.mjs', ...args], { cwd: base, encoding: 'utf8' });

test('machine-readable report distinguishes candidate and confirmed', () => {
  const result = run('scan', 'examples', '--format', 'json');
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.summary.candidates, 2);
  assert.equal(report.summary.confirmed, 0);
  assert.ok(report.findings.every(f => f.level === 'E0'));
});
test('explicit fail-on candidates uses exit code 1', () => {
  const result = run('check', 'examples', '--fail-on', 'candidates');
  assert.equal(result.status, 1);
});
test('invalid flag gives exit 2', () => {
  const result = run('scan', 'examples', '--format', 'xml');
  assert.equal(result.status, 2);
});
test('clean input returns exit 0', () => {
  const result = run('scan', 'examples/clean.js', '--fail-on', 'candidates');
  assert.equal(result.status, 0);
});
