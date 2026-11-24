import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as current from '../src/scanner.mjs';

const baselineSha = '4f90aba66c4f0befbea7294be1bcb79d7e99a929';
const root = fileURLToPath(new URL('../', import.meta.url));
const baselineRoot = path.join(root, '.benchmark-baseline');
const revision = dir => execFileSync('git', ['-C', dir, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
assert.equal(revision(baselineRoot), baselineSha);
const baseline = await import('../.benchmark-baseline/src/scanner.mjs');

// Same hand-labelled, synthetic syntax examples, never executed.
const cases = [
  ['input.js', 'items.forEach(async x => { await save(x); });', ['GP001']],
  ['input.js', 'items.forEach(async x => { console.log(x); });', []],
  ['input.js', 'items.forEach(x => save(x));', []],
  ['input.ts', 'new Promise<number>(async resolve => resolve(1));', ['GP002']],
  ['input.js', 'new Promise(resolve => resolve(1));', []],
  ['input.js', '// new Promise(async r => r(1));', []],
  ['input.tsx', 'const el = <span>hello</span>;', []],
  ['input.js', 'items.forEach(async x => save(x)); new Promise(async r => r(1));', ['GP001', 'GP002']],
];
const syntaxScore = engine => cases.reduce((score, [file, source, expected]) => {
  const r = engine.analyzeSource(source, file);
  const actual = r.findings.map(f => f.ruleId).sort();
  return score + Number(r.diagnostics.length === 0 &&
    JSON.stringify(actual) === JSON.stringify([...expected].sort()) &&
    r.findings.every(f => f.level === 'E0' && f.classification === 'candidate'));
}, 0);

const dir = await mkdtemp(path.join(tmpdir(), 'ghostproof-comparison-'));
try {
  const input = path.join(dir, 'clean.js');
  await writeFile(input, 'const value = 1;');
  // Public scanPath contract, with identical valid and invalid options.
  const invalid = [0, -1, 1.5, NaN, Infinity, '2', Number.MAX_SAFE_INTEGER + 1];
  async function measure(engine) {
    let rejectedInvalid = 0;
    let acceptedValid = 0;
    for (const target of [input, dir]) {
      for (const key of ['maxFiles', 'maxBytes']) {
        for (const value of invalid) {
          try { await engine.scanPath(target, { [key]: value }); }
          catch (error) {
            if (error instanceof RangeError && error.message === key + ' must be a positive safe integer') rejectedInvalid++;
          }
        }
      }
      for (const opts of [{}, { maxFiles: 1, maxBytes: 16 }]) {
        const r = await engine.scanPath(target, opts);
        if (r.summary.scannedFiles === 1 && r.summary.candidates === 0 && r.summary.confirmed === 0) acceptedValid++;
      }
    }
    return { syntaxMatches: syntaxScore(engine), syntaxTotal: cases.length, rejectedInvalid, invalidTotal: 28, acceptedValid, validTotal: 4 };
  }
  const before = await measure(baseline);
  const after = await measure(current);
  console.log(JSON.stringify({ kind: 'synthetic-contract-comparison', baseline: baselineSha, current: revision(root), node: process.version, before, after }));
  assert.equal(before.syntaxMatches, cases.length);
  assert.equal(after.syntaxMatches, cases.length);
  assert.equal(before.acceptedValid, 4);
  assert.equal(after.acceptedValid, 4);
  assert.equal(after.rejectedInvalid, 28);
  assert.ok(after.rejectedInvalid > before.rejectedInvalid);
} finally { await rm(dir, { recursive: true, force: true }); }
