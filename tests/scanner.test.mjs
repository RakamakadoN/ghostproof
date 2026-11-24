import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { scanText, scanPath, analyzeSource } from '../src/scanner.mjs';

const codes = (text, file = 'input.js') => scanText(text, file).map(f => f.ruleId);

test('GP001 identifies an async forEach arrow callback', () => {
  assert.deepEqual(codes('items.forEach(async (item) => { await save(item); });'), ['GP001']);
});
test('GP001 supports async function callback and multiline syntax', () => {
  assert.deepEqual(codes('items.forEach(\n async function (item) { await save(item); }\n);'), ['GP001']);
});
test('GP001 supports optional chaining and string-literal member access', () => {
  assert.deepEqual(codes('items?.forEach(async x => x()); items["forEach"](async x => x());'), ['GP001', 'GP001']);
});
test('GP001 supports TypeScript callback assertions and type syntax', () => {
  assert.deepEqual(codes('items.forEach((async (x: number) => { await save(x) }) as (x: number) => void)', 'input.ts'), ['GP001']);
});
test('GP001 avoids no-await async logging blocks from a pinned real-world case', () => {
  // Minimized syntactic shape of public android-emulator-runner/src/main.ts
  // at commit ed009f5318f15b1cf93a191b856c4f1748a2d4c1 (lines 176,184).
  const source = [
    'scripts.forEach(async (script: string) => { console.log(script); });',
    'preEmulatorLaunchScripts?.forEach(async (script: string) => { console.log(script); });',
  ].join('\n');
  assert.deepEqual(codes(source, 'main.ts'), []);
});
test('GP001 retains async callback that returns a Promise without await', () => {
  assert.deepEqual(codes('items.forEach(async (item) => { return save(item); });'), ['GP001']);
  assert.deepEqual(codes('items.forEach(async item => save(item));'), ['GP001']);
});
test('GP001 retains async throw without await, and ignores nested unrelated awaits', () => {
  assert.deepEqual(codes('items.forEach(async item => { throw new Error(String(item)); });'), ['GP001']);
  assert.deepEqual(codes('items.forEach(async item => { const f = async () => await fetch(item); console.log(item); });'), []);
});
test('GP002 identifies async Promise executor', () => {
  assert.deepEqual(codes('new Promise(async (resolve, reject) => { await work(); resolve(); });'), ['GP002']);
});
test('GP002 supports generic TypeScript Promise', () => {
  assert.deepEqual(codes('return new Promise<number>(async resolve => { resolve(1) });', 'input.ts'), ['GP002']);
});
test('does not flag comments, strings, templates or regex literals', () => {
  const source = [
    '// things.forEach(async x => {})',
    '/* new Promise(async () => {}) */',
    "const text = 'things.forEach(async x => {})';",
    'const template = `new Promise(async () => {})`;',
    'const regex = /forEach\\(async/;',
  ].join('\n');
  assert.deepEqual(codes(source), []);
});
test('does not flag sync forEach, async map, method declarations or property names', () => {
  const source = [
    'items.forEach(x => save(x));',
    'await Promise.all(items.map(async x => save(x)));',
    'const o = { forEach: async x => x };',
    'new wrapper.Promise(async x => x());',
  ].join('\n');
  assert.deepEqual(codes(source), []);
});
test('does not flag JSX attributes with strings or TSX markup', () => {
  assert.deepEqual(codes('const el = <button title="items.forEach(async x => x())" />;', 'input.tsx'), []);
});
test('reports stable sorted locations and only E0', () => {
  const source = '// header\nnew Promise(async x => x());\nitems.forEach(async x => x());';
  const found = scanText(source, 'lib/a.js');
  assert.deepEqual(found.map(x => [x.ruleId, x.line, x.classification]), [
    ['GP002', 2, 'candidate'], ['GP001', 3, 'candidate'],
  ]);
  assert.equal(found[0].fingerprint, scanText(source, 'lib/a.js')[0].fingerprint);
  assert.ok(found.every(x => x.level === 'E0'));
});
test('does not return AST findings from syntactically invalid source', () => {
  const analysis = analyzeSource('function broken ( { items.forEach(async x => x())', 'bad.js');
  assert.equal(analysis.findings.length, 0);
  assert.ok(analysis.diagnostics.length > 0);
});
test('scans directory while skipping dependencies, symlinks and large files', async () => {
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
    assert.equal(result.tool.engine, 'typescript-ast');
  } finally { await rm(dir, { recursive: true, force: true }); }
});
test('records and skips syntax failures in the coverage summary', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ghostproof-'));
  try {
    await writeFile(path.join(dir, 'broken.js'), 'const x = (');
    await writeFile(path.join(dir, 'valid.js'), 'new Promise(async resolve => resolve(1));');
    const report = await scanPath(dir);
    assert.equal(report.summary.skippedParseErrors, 1);
    assert.equal(report.summary.scannedFiles, 1);
    assert.equal(report.summary.candidates, 1);
    assert.equal(report.diagnostics[0].path, 'broken.js');
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
test('scanner never executes target source', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ghostproof-'));
  try {
    const flag = path.join(dir, 'executed.txt');
    await writeFile(path.join(dir, 'bad.js'), `import { writeFileSync } from 'node:fs'; writeFileSync(${JSON.stringify(flag)}, 'bad');\nitems.forEach(async x => x());`);
    const report = await scanPath(dir);
    assert.equal(report.summary.candidates, 1);
    const { access } = await import('node:fs/promises');
    await assert.rejects(() => access(flag), { code: 'ENOENT' });
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('scanPath rejects invalid limits for both file and directory inputs', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ghostproof-limits-'));
  try {
    const file = path.join(dir, 'empty.js');
    await writeFile(file, '');
    for (const target of [dir, file]) {
      for (const key of ['maxFiles', 'maxBytes']) {
        for (const value of [0, -1, 1.5, NaN, Infinity, '2', Number.MAX_SAFE_INTEGER + 1]) {
          await assert.rejects(() => scanPath(target, { [key]: value }), {
            name: 'RangeError', message: key + ' must be a positive safe integer',
          });
        }
      }
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('empty directory and empty source have distinct coverage counts', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ghostproof-empty-'));
  try {
    const empty = await scanPath(dir, { maxFiles: 1, maxBytes: 1 });
    assert.equal(empty.summary.visitedFiles, 0);
    assert.equal(empty.summary.scannedFiles, 0);
    const file = path.join(dir, 'empty.js');
    await writeFile(file, '');
    const report = await scanPath(file, { maxFiles: 1, maxBytes: 1 });
    assert.equal(report.summary.visitedFiles, 1);
    assert.equal(report.summary.scannedFiles, 1);
    assert.equal(report.summary.candidates, 0);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('scanPath accepts exact file and byte limits', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ghostproof-boundary-'));
  try {
    await writeFile(path.join(dir, 'a.js'), '// é');
    const report = await scanPath(dir, { maxFiles: 1, maxBytes: 5 });
    assert.equal(report.summary.scannedFiles, 1);
    assert.equal(report.summary.skippedLarge, 0);
    const smaller = await scanPath(dir, { maxFiles: 1, maxBytes: 4 });
    assert.equal(smaller.summary.scannedFiles, 0);
    assert.equal(smaller.summary.skippedLarge, 1);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
