import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const currentFolder = path.dirname(fileURLToPath(import.meta.url));
const fixtures = Object.freeze({
  GP001: 'gp001.mjs',
  GP002: 'gp002.mjs',
});

/** Isolated E1 evidence: executes ONLY bundled, repository-owned fixture programs. */
export function runExperiments(ruleId = 'all') {
  const selected = ruleId === 'all' ? Object.keys(fixtures) : [ruleId];
  if (selected.some(id => !Object.hasOwn(fixtures, id))) {
    throw new Error(`Unknown experiment ${ruleId}. Choose GP001, GP002, or --all.`);
  }
  const experiments = selected.map(id => {
    const fixture = path.resolve(currentFolder, '../experiments/fixtures', fixtures[id]);
    const child = spawnSync(process.execPath, [fixture], {
      encoding: 'utf8',
      timeout: 2000,
      maxBuffer: 64 * 1024,
      env: { PATH: process.env.PATH ?? '' },
    });
    if (child.error || child.status !== 0) {
      return {
        ruleId: id,
        level: 'E1',
        classification: 'isolated-mechanism',
        observed: false,
        error: child.error?.message ?? child.stderr?.trim().slice(0, 500) ?? 'fixture exited with nonzero status',
      };
    }
    try {
      const observation = JSON.parse(child.stdout.trim());
      return { ruleId: id, level: 'E1', classification: 'isolated-mechanism', ...observation };
    } catch {
      return { ruleId: id, level: 'E1', classification: 'isolated-mechanism', observed: false, error: 'Invalid fixture output' };
    }
  });
  return {
    schemaVersion: '0.3',
    tool: 'ghostproof',
    kind: 'builtin-mechanism-experiment',
    evidenceLevel: 'E1',
    scope: 'repository-owned fixtures only',
    projectBugConfirmed: false,
    experiments,
    passed: experiments.every(exp => exp.observed === true),
    note: 'E1 confirms a language/runtime mechanism, not a defect in any scanned repository. No target code is executed.',
  };
}
