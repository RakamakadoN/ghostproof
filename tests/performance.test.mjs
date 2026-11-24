import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import os from 'node:os';
import path from 'node:path';
import { scanPath } from '../src/scanner.mjs';

const sizes = [50, 200, 1000];
const repetitions = 3;
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

// Repository-generated synthetic fixtures; never executed. Timing includes
// directory traversal, file reading, AST analysis and report construction,
// but excludes fixture generation. No timing threshold on shared CI hosts.
test('synthetic scanner performance baseline', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ghostproof-perf-'));
  try {
    const source = 'export const label = "synthetic";\nexport function identity(value) { return value; }\n';
    const warm = path.join(root, 'warm');
    await mkdir(warm);
    await writeFile(path.join(warm, 'warm.js'), source);
    await scanPath(warm);
    t.diagnostic(JSON.stringify({ kind: 'benchmark-environment', node: process.version, platform: process.platform, arch: process.arch, cpu: os.cpus()[0]?.model, availableParallelism: os.availableParallelism(), repetitions }));
    for (const count of sizes) {
      const dir = path.join(root, String(count));
      await mkdir(dir);
      for (let i = 0; i < count; i++) {
        await writeFile(path.join(dir, String(i).padStart(4, '0') + '.js'), source);
      }
      const elapsedMs = [];
      const rssBeforeBytes = [];
      const rssAfterBytes = [];
      for (let trial = 0; trial < repetitions; trial++) {
        rssBeforeBytes.push(process.memoryUsage().rss);
        const start = performance.now();
        const report = await scanPath(dir);
        elapsedMs.push(performance.now() - start);
        rssAfterBytes.push(process.memoryUsage().rss);
        assert.equal(report.summary.visitedFiles, count);
        assert.equal(report.summary.scannedFiles, count);
        assert.equal(report.summary.candidates, 0);
        assert.equal(report.summary.confirmed, 0);
        assert.deepEqual(report.diagnostics, []);
      }
      const medianMs = median(elapsedMs);
      t.diagnostic(JSON.stringify({ kind: 'synthetic-performance-baseline', files: count, sourceBytes: count * Buffer.byteLength(source), elapsedMs, medianMs, filesPerSecond: count * 1000 / medianMs, rssBeforeBytes, rssAfterBytes }));
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
