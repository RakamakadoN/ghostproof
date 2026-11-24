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
  assert.equal(report.tool.engine, 'typescript-ast');
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
test('CLI runs isolated E1 experiments with JSON output', () => {
  const result = run('experiment', '--all', '--format', 'json');
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.passed, true);
  assert.equal(report.projectBugConfirmed, false);
  assert.equal(report.experiments.length, 2);
});
test('CLI prevents choosing arbitrary executable E1 fixtures', () => {
  const result = run('experiment', 'examples/buggy.js');
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Unknown experiment/);
});

for (const args of [['experiment', 'GP001'], ['proof', 'BW001'], ['verify', 'report.json'], ['study']]) {
  for (const flag of [['--fail-on', 'none'], ['--fail-on=none'], ['--fail-on=candidates']]) {
    test(`${args[0]} rejects scan-only option ${flag.join(' ')}`, () => {
      const result = run(...args, ...flag);
      assert.equal(result.status, 2, result.stderr);
      assert.match(result.stderr, /Scan-only options are only available with scan or check/);
    });
  }
}
test('repeated fail-on cannot hide explicit scan-only usage', () => {
  const result = run('study', '--fail-on=candidates', '--fail-on=none');
  assert.equal(result.status, 2, result.stderr);
  assert.match(result.stderr, /Scan-only options are only available with scan or check/);
});
for (const command of ['scan', 'check']) {
  test(`${command} accepts explicit fail-on none`, () => {
    const result = run(command, 'examples', '--fail-on=none', '--format', 'json');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).summary.candidates, 2);
  });
}

test('CLI help describes scan-only options and verification failure', () => {
  const result = run('--help');
  assert.equal(result.status, 0, result.stderr);
  for (const option of ['--max-files', '--max-bytes', '--fail-on']) {
    assert.ok(result.stdout.split('\n').some(line => line.includes(option) && line.includes('scan/check only')), option);
  }
  assert.match(result.stdout, /unsuccessful experiment\/proof\/verification/);
});

test('release version and stable scan schema are distinct', () => {
  const help = run('--help');
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /Ghostproof v0\.6/);
  const result = run('scan', 'examples', '--format', 'json');
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.tool.version, '0.6.0');
  assert.equal(report.schemaVersion, '0.5');
});
