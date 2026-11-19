import test from 'node:test';
import assert from 'node:assert/strict';
import { runExperiments } from '../src/experiments.mjs';

test('both bounded mechanism experiments demonstrate their hypotheses', () => {
  const result = runExperiments('all');
  assert.equal(result.evidenceLevel, 'E1');
  assert.equal(result.passed, true);
  assert.equal(result.projectBugConfirmed, false);
  assert.deepEqual(result.experiments.map(e => e.ruleId), ['GP001', 'GP002']);
  assert.ok(result.experiments.every(e => e.observed && e.classification === 'isolated-mechanism'));
});
test('can run a single E1 rule', () => {
  const result = runExperiments('GP001');
  assert.equal(result.experiments.length, 1);
  assert.equal(result.experiments[0].completedImmediately, 0);
  assert.equal(result.experiments[0].completedAfterRelease, 2);
});
test('rejects unknown E1 fixture IDs', () => {
  assert.throws(() => runExperiments('../any'), /Unknown experiment/);
});
