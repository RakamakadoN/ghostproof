import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeSource } from './scanner.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const project = 'experiments/projects/batch-writer';
const paths = ['before.mjs', 'after.mjs', 'verify.mjs'];
const ids = Object.freeze({ BW001: { ruleId: 'GP001', contract: 'persistBatch resolves only after all records are persisted' } });
const sha256 = content => createHash('sha256').update(content).digest('hex');

function runVariant(variant) {
  const file = path.resolve(root, project, 'verify.mjs');
  const child = spawnSync(process.execPath, [file, variant], {
    cwd: path.resolve(root, project),
    env: { PATH: process.env.PATH ?? '' },
    timeout: 3000,
    maxBuffer: 32 * 1024,
    encoding: 'utf8',
  });
  if (child.error || child.status !== 0 || child.signal) {
    throw new Error(`Bundled fixture ${variant} did not complete: ${child.error?.message ?? child.stderr?.slice(0, 300) ?? child.signal ?? child.status}`);
  }
  let result;
  try { result = JSON.parse(child.stdout.trim()); }
  catch { throw new Error(`Bundled fixture ${variant} returned invalid JSON`); }
  if (result.testId !== 'BW001-COMPLETION' || result.variant !== variant ||
      typeof result.contractPassed !== 'boolean' || !result.actual || !result.expected) {
    throw new Error(`Bundled fixture ${variant} returned an invalid result shape`);
  }
  return result;
}

/** Run only allowlisted *bundled sample project* revisions, never caller-supplied source. */
export function runProjectProof(caseId = 'BW001') {
  if (!Object.hasOwn(ids, caseId)) {
    throw new Error(`Unknown project proof ${caseId}. Only BW001 is supported; arbitrary project execution is forbidden.`);
  }
  const source = Object.fromEntries(paths.map(name => {
    const file = path.join(root, project, name);
    return [name, { sha256: sha256(readFileSync(file)), path: `${project}/${name}` }];
  }));
  const beforeSource = readFileSync(path.join(root, project, 'before.mjs'), 'utf8');
  const afterSource = readFileSync(path.join(root, project, 'after.mjs'), 'utf8');
  const beforeScan = analyzeSource(beforeSource, `${project}/before.mjs`);
  const afterScan = analyzeSource(afterSource, `${project}/after.mjs`);
  const beforeCandidates = beforeScan.findings.filter(f => f.ruleId === ids[caseId].ruleId);
  const afterCandidates = afterScan.findings.filter(f => f.ruleId === ids[caseId].ruleId);
  const before = runVariant('before');
  const after = runVariant('after');
  const reproduced = before.contractPassed === false &&
    before.actual.settledBeforeSaveCompleted === true && beforeCandidates.length === 1;
  const regressionGuarded = reproduced && after.contractPassed === true && afterCandidates.length === 0;
  return {
    schemaVersion: '0.3',
    tool: { name: 'ghostproof', version: '0.3.0' },
    kind: 'bundled-project-proof',
    caseId,
    ruleId: ids[caseId].ruleId,
    scope: 'bundled-sample-project-only',
    externalProjectBugConfirmed: false,
    project: { id: 'batch-writer', contract: ids[caseId].contract, sources: source },
    environment: { node: process.version, platform: process.platform, arch: process.arch },
    e0: { beforeCandidates, afterCandidates },
    e2: { label: 'bundled-sample-reproduction', reproduced, expected: before.expected, actual: before.actual },
    e3: {
      label: 'bundled-sample-red-green',
      regressionGuarded,
      sameTestSha256: source['verify.mjs'].sha256,
      before: { contractPassed: before.contractPassed, observed: before.actual },
      after: { contractPassed: after.contractPassed, observed: after.actual },
    },
    passed: regressionGuarded,
    note: 'This proves only a deliberately defective repository-owned sample. No external target project code was executed or verified.',
  };
}
