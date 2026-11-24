import { createHash } from 'node:crypto';
import { isDeepStrictEqual, TextDecoder } from 'node:util';
import { lstat, readFile } from 'node:fs/promises';
import { readFileSync, lstatSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runProjectProof } from './project-proof.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtureRoot = path.join(root, 'experiments/projects/batch-writer');
const MAX_REPORT_BYTES = 512 * 1024;

// Pin the shipped v0.3 sample fixtures BEFORE running any proof subprocesses.
// A hash establishes identity of local bytes, not an independent signature of the report.
export const BUNDLED_BW001_HASHES = Object.freeze({
  'before.mjs': 'a58029ec5c2463387ad4e47b16d41d21a1e65954d3ed6bd4853a01aa917906b1',
  'after.mjs': '3a264453f548b3a8fa339cfbf58032255bf2f450af481486c95d2b67fb245703',
  'verify.mjs': '0dd1c38f76e4a22c38bffb3301db72ff969e05adaff9d2e7c70ca2628c48a06f',
});
const sha256 = content => createHash('sha256').update(content).digest('hex');

function rejection(reason, reportSha256 = null) {
  return {
    schemaVersion: '0.4',
    kind: 'bundled-evidence-verification',
    caseId: 'BW001',
    passed: false,
    reportSha256,
    checks: { pinnedFixtures: false, deterministicReplay: false },
    reason,
    note: 'Bundled BW001 verification only; not an external-project E2/E3 confirmation or a cryptographic signature.',
  };
}

/**
 * Verification is intentionally limited to one allowlisted bundled sample.
 * Never consult report-supplied paths, commands, code or URLs for execution.
 * Existing v0.3 BW001 evidence remains valid under the v0.4 verifier.
 */
export function verifyBundledEvidence(report, reportBytes = null) {
  const reportSha256 = reportBytes === null ? null : sha256(reportBytes);
  if (!report || typeof report !== 'object' || Array.isArray(report) ||
      report.kind !== 'bundled-project-proof' || report.caseId !== 'BW001' ||
      report.scope !== 'bundled-sample-project-only') {
    return rejection('Unsupported or invalid evidence envelope; only v0.3 BW001 bundled reports are supported.', reportSha256);
  }

  // Verify package-controlled inputs against hardcoded release hashes first.
  // If they are different, do NOT run the bundled test code.
  for (const [name, expected] of Object.entries(BUNDLED_BW001_HASHES)) {
    const file = path.join(fixtureRoot, name);
    let info, bytes;
    try {
      info = lstatSync(file);
      if (!info.isFile() || info.isSymbolicLink()) return rejection(`Untrusted bundled fixture type: ${name}`, reportSha256);
      bytes = readFileSync(file);
    } catch (error) { return rejection(`Cannot read bundled fixture ${name}: ${error.code ?? error.message}`, reportSha256); }
    if (sha256(bytes) !== expected) return rejection(`Pinned bundled fixture hash mismatch: ${name}`, reportSha256);
  }

  // Reproduce the known bounded sample locally, then compare the entire
  // report so a forged boolean, path, SHA, expected/actual, or extra field fails.
  let canonical;
  try { canonical = runProjectProof('BW001'); }
  catch (error) { return rejection(`Bundled replay failed: ${error.message}`, reportSha256); }
  if (!canonical.passed) return rejection('Bundled replay did not satisfy E2/E3.', reportSha256);
  if (!isDeepStrictEqual(report, canonical)) {
    return {
      ...rejection('Evidence differs from independently reproduced bundled results.', reportSha256),
      checks: { pinnedFixtures: true, deterministicReplay: false },
    };
  }
  return {
    schemaVersion: '0.4',
    kind: 'bundled-evidence-verification',
    caseId: 'BW001',
    passed: true,
    reportSha256,
    checks: { pinnedFixtures: true, deterministicReplay: true },
    sourceHashes: BUNDLED_BW001_HASHES,
    note: 'A local replay of the trusted BW001 sample agrees with this v0.3 evidence. This does not authenticate its author or verify any external project.',
  };
}

/** Read only a bounded, regular JSON file. No report-provided commands execute. */
export async function verifyEvidenceFile(inputPath) {
  const full = path.resolve(inputPath);
  const info = await lstat(full);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error('Evidence input must be a regular file (not a symlink).');
  if (info.size > MAX_REPORT_BYTES) throw new Error('Evidence exceeds 512 KiB maximum.');
  const raw = await readFile(full);
  if (raw.byteLength > MAX_REPORT_BYTES) throw new Error('Evidence exceeds 512 KiB maximum.');
  let report;
  try {
    // Reject malformed encoding rather than silently replacing invalid bytes.
    const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
    report = JSON.parse(decoder.decode(raw));
  }
  catch { throw new Error('Evidence file is not valid UTF-8 JSON.'); }
  return verifyBundledEvidence(report, raw);
}
