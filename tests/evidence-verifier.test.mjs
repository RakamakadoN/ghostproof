import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { runProjectProof } from '../src/project-proof.mjs';
import { verifyBundledEvidence, verifyEvidenceFile, BUNDLED_BW001_HASHES } from '../src/evidence-verifier.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = (...args) => spawnSync(process.execPath, ['./bin/ghostproof.mjs', ...args], { cwd: root, encoding: 'utf8', timeout: 10000 });

// v0.3 evidence reports remain consumable without rewriting any fields.
test('verifies v0.3 BW001 evidence by matching release-pinned fixtures and replay', () => {
  const record = runProjectProof('BW001');
  const verified = verifyBundledEvidence(record);
  assert.equal(record.schemaVersion, '0.3');
  assert.equal(verified.schemaVersion, '0.4');
  assert.equal(verified.passed, true);
  assert.deepEqual(verified.checks, { pinnedFixtures: true, deterministicReplay: true });
  assert.equal(verified.caseId, 'BW001');
});

test('original fixture hashes agree with pinned v0.3 code', async () => {
  for (const [file, sha] of Object.entries(BUNDLED_BW001_HASHES)) {
    const bytes = await readFile(path.join(root, 'experiments/projects/batch-writer', file));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), sha);
  }
});

test('rejects modifications to E2/E3 verdict, observations, fingerprint and metadata', () => {
  const baseline = runProjectProof('BW001');
  const mutate = [
    r => { r.e2.reproduced = false; },
    r => { r.e3.regressionGuarded = false; },
    r => { r.e2.actual.settledBeforeSaveCompleted = false; },
    r => { r.e3.after.contractPassed = false; },
    r => { r.e3.sameTestSha256 = '0'.repeat(64); },
    r => { r.project.sources['before.mjs'].sha256 = 'f'.repeat(64); },
    r => { r.e0.beforeCandidates[0].fingerprint = 'modified'; },
    r => { r.externalProjectBugConfirmed = true; },
    r => { r.project.sources['verify.mjs'].path = '/tmp/injected.mjs'; },
    r => { r.project.command = 'node injected.mjs'; },
    r => { r.caseId = '../other'; },
    r => { r.passed = false; },
  ];
  for (const apply of mutate) {
    const forged = structuredClone(baseline);
    apply(forged);
    assert.equal(verifyBundledEvidence(forged).passed, false);
  }
});

test('rejects wrong evidence kind, empty data, arrays and arbitrary external case IDs', () => {
  for (const report of [null, [], {}, { kind: 'project-proof', caseId: 'BW001' },
    { kind: 'bundled-project-proof', caseId: 'EXTERNAL', scope: 'bundled-sample-project-only' }]) {
    assert.equal(verifyBundledEvidence(report).passed, false);
  }
});

test('CLI accepts local v0.3 bundle; rejects tampering and unsupported commands', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ghostproof-verify-'));
  try {
    const valid = path.join(dir, 'valid.json');
    const tampered = path.join(dir, 'tampered.json');
    const record = runProjectProof('BW001');
    await writeFile(valid, JSON.stringify(record));
    let proc = cli('verify', valid, '--format', 'json');
    assert.equal(proc.status, 0, proc.stderr);
    assert.equal(JSON.parse(proc.stdout).passed, true);
    assert.match(JSON.parse(proc.stdout).reportSha256, /^[a-f0-9]{64}$/);
    assert.equal((await verifyEvidenceFile(valid)).passed, true);
    record.e3.before.contractPassed = true;
    await writeFile(tampered, JSON.stringify(record));
    proc = cli('verify', tampered, '--format', 'json');
    assert.equal(proc.status, 1, proc.stderr);
    assert.equal(JSON.parse(proc.stdout).passed, false);
    for (const args of [
      ['verify', valid, '--output', path.join(dir, 'overwrite.json')],
      ['verify', valid, '--fail-on', 'candidates'],
      ['verify', valid, '--max-files', '10'],
      ['verify'],
    ]) {
      proc = cli(...args);
      assert.equal(proc.status, 2, `${args.join(' ')} => ${proc.stderr}`);
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('rejects malformed, oversized and symlinked report files without running report code', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ghostproof-verify-input-'));
  try {
    const malformed = path.join(dir, 'invalid.json');
    const oversized = path.join(dir, 'oversized.json');
    const linked = path.join(dir, 'linked.json');
    const flag = path.join(dir, 'must-not-exist');
    await writeFile(malformed, '{"exec":"touch ' + flag + '",oops');
    await writeFile(oversized, ' '.repeat(512 * 1024 + 1));
    await symlink(malformed, linked);
    for (const file of [malformed, oversized, linked]) {
      assert.equal(cli('verify', file).status, 2);
    }
    await assert.rejects(readFile(flag));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('evidence files require well-formed UTF-8 before JSON parsing', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ghostproof-utf8-'));
  try {
    const file = path.join(dir, 'encoding.json');
    // JSON syntax is valid after lossy decoding, but its source bytes are not UTF-8.
    for (const invalid of [[0xff], [0xc3, 0x28], [0xe2, 0x82]]) {
      await writeFile(file, Buffer.concat([
        Buffer.from('{"label":"'), Buffer.from(invalid), Buffer.from('"}'),
      ]));
      await assert.rejects(() => verifyEvidenceFile(file), /not valid UTF-8 JSON/);
    }
    // Valid non-ASCII and literal replacement characters are accepted as
    // encoding; this envelope is still rejected by the ordinary schema guard.
    await writeFile(file, JSON.stringify({ label: 'Клубок é \uFFFD' }));
    const result = await verifyEvidenceFile(file);
    assert.equal(result.passed, false);
    assert.match(result.reason, /Unsupported or invalid evidence envelope/);
    // Keep the existing behavior for a leading UTF-8 BOM.
    await writeFile(file, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('{}')]));
    await assert.rejects(() => verifyEvidenceFile(file), /not valid UTF-8 JSON/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
