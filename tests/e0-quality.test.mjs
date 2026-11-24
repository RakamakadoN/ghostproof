import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSource } from '../src/scanner.mjs';

// Hand-labelled, repository-owned examples for the documented E0 syntax
// contract. These labels do not establish runtime defects or real-world rates.
const cases = [
  ['await in direct callback', 'items.forEach(async x => { await save(x); });', 'input.js', ['GP001']],
  ['explicit return', 'items.forEach(async x => { return save(x); });', 'input.js', ['GP001']],
  ['for await loop', 'items.forEach(async x => { for await (const y of x) { save(y); } });', 'input.js', ['GP001']],
  ['throw in direct callback', 'items.forEach(async x => { throw Error(x); });', 'input.js', ['GP001']],
  ['literal member', 'items["forEach"](async x => save(x));', 'input.js', ['GP001']],
  ['TS assertion', 'items.forEach((async (x: number) => save(x)) as (x: number) => Promise<void>);', 'input.ts', ['GP001']],
  ['synchronous callback', 'items.forEach(x => save(x));', 'input.js', []],
  ['async logging block', 'items.forEach(async x => { console.log(x); });', 'input.js', []],
  ['nested await only', 'items.forEach(async x => { const f = async () => await save(x); });', 'input.js', []],
  ['async map', 'items.map(async x => save(x));', 'input.js', []],
  ['async executor', 'new Promise(async resolve => { await save(1); resolve(1); });', 'input.js', ['GP002']],
  ['generic executor', 'new Promise<number>(async resolve => resolve(1));', 'input.ts', ['GP002']],
  ['function executor', 'new Promise(async function (resolve) { resolve(1); });', 'input.js', ['GP002']],
  ['sync executor', 'new Promise(resolve => resolve(1));', 'input.js', []],
  ['qualified constructor outside rule', 'new custom.Promise(async resolve => resolve(1));', 'input.js', []],
  ['string not code', 'const s = "new Promise(async resolve => resolve(1));";', 'input.js', []],
  ['comment not code', '// items.forEach(async x => save(x));', 'input.js', []],
  ['both rules', 'items.forEach(async x => save(x)); new Promise(async r => r(1));', 'input.js', ['GP001', 'GP002']],
];

for (const [name, source, file, expected] of cases) {
  test('E0 labelled corpus: ' + name, () => {
    const result = analyzeSource(source, file);
    assert.deepEqual(result.diagnostics, []);
    assert.deepEqual(result.findings.map(f => f.ruleId).sort(), [...expected].sort());
    assert.ok(result.findings.every(f => f.level === 'E0' && f.classification === 'candidate'));
  });
}

test('E0 corpus: known scope limitations remain explicit', () => {
  // Intentionally detached work is not evidence of an application fault.
  // The existing heuristic does not follow named callback bindings or types.
  const detached = analyzeSource('items.forEach(async x => { save(x); });');
  const named = analyzeSource('const f = async x => save(x); items.forEach(f);');
  for (const result of [detached, named]) {
    assert.deepEqual(result.diagnostics, []);
    assert.deepEqual(result.findings, []);
  }
});
