import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { scanText, scanPath, maskNonCode } from '../src/scanner.mjs';

const codes = (text) => scanText(text).map(f => f.ruleId);

test('GP001 identifies async forEach arrow callback', () => {
  assert.deepEqual(codes('items.forEach(async (item) => { await save(item); });'), ['GP001']);
});
test('GP001 supports async function callback and multiline syntax', () => {
  assert.deepEqual(codes('items.forEach(\n async function (item) { await save(item); }\n);'), ['GP001']);
});
test('GP002 identifies async Promise executor', () => {
  assert.deepEqual(codes('new Promise(async (resolve, reject) => { await work(); resolve(); });'), ['GP002']);
});
test('GP002 supports generic TypeScript Promise', () => {
  assert.deepEqual(codes('return new Promise<number>(async resolve => { resolve(1) });'), ['GP002']);
});
test('ignores strings, comments, and templates', () => {
  const source = [
    '// things.forEach(async x => {})',
    '/* new Promise(async () => {}) */',
    "const text = 'things.forEach(async x => {})';",
    'const template = `new Promise(async () => {})`;',
  ].join('\n');
  assert.deepEqual(codes(source), []);
  assert.equal(maskNonCode(source).split('\n').length, 4);
});
test('does not flag sync forEach or async map with Promise.all', () => {
  assert.deepEqual(codes('items.forEach(x => save(x)); await Promise.all(items.map(async x => save(x)));'), []);
});
test('reports stable, sorted locations and marks only E0', () => {
  const source = '// header\nnew Promise(async x => x());\nitems.forEach(async x => x());';
  const found = scanText(source, 'lib/a.js');
  assert.deepEqual(found.map(x => [x.ruleId, x.line, x.classification]), [['GP002', 2, 'candidate'], ['GP001', 3, 'candidate']]);
  assert.equal(found[0].fingerprint, scanText(source, 'lib/a.js')[0].fingerprint);
  assert.ok(found.every(x => x.level === 'E0'));
});
test('scans directory while skipping ignored directories, symlinks, and large files', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ghostproof-'));
  try {
    await mkdir(path.join(dir, 'node_modules'));
    await writeFile(path.join(dir, 'node_modules', 'skip.js'), 'x.forEach(async x => x());');
    await writeFile(path.join(dir, 'ok.js'), 'const x = 1;');
    await writeFile(path.join(dir, 'bad.ts'), 'new Promise(async (resolve) => resolve(1));');
    await writeFile(path.join(dir, 'large.js'), 'x'.repeat(100));
    await symlink(path.join(dir, 'bad.ts'), path.join(dir, 'linked.ts'));
    const result = await scanPath(dir, { maxBytes: 90 });
    assert.equal(result.summary.candidates, 1);
    assert.equal(result.summary.skippedLarge, 1);
    assert.equal(result.summary.skippedSymlinks, 1);
    assert.equal(result.summary.confirmed, 0);
    assert.equal(result.findings[0].path, 'bad.ts');
  } finally { await rm(dir, { recursive: true, force: true }); }
});
test('rejects excess file count rather than silently truncating', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ghostproof-'));
  try {
    await writeFile(path.join(dir, 'a.js'), '');
    await writeFile(path.join(dir, 'b.js'), '');
    await assert.rejects(() => scanPath(dir, { maxFiles: 1 }), /limit exceeded/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
