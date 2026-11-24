#!/usr/bin/env node
import { scanPath } from '../src/scanner.mjs';
import { runExperiments } from '../src/experiments.mjs';
import { runProjectProof } from '../src/project-proof.mjs';
import { verifyEvidenceFile } from '../src/evidence-verifier.mjs';
import { runPinnedStudy } from '../src/pinned-study.mjs';
import { writeFile } from 'node:fs/promises';

const HELP = `Ghostproof v0.6 — evidence-first candidates and bounded reproduction experiments

Usage:
  ghostproof scan [path] [--format text|json] [--fail-on candidates|none]
  ghostproof check [path] [--format text|json] [--fail-on candidates|none]
  ghostproof experiment GP001|GP002|--all [--format text|json]
  ghostproof proof BW001 [--format text|json] [--output report.json]
  ghostproof verify report.json [--format text|json]
  ghostproof study [--format text|json]

Options:
  --max-files N       Maximum source files (scan/check only; default 2000)
  --max-bytes N       Maximum bytes per source file (scan/check only; default 524288)
  --fail-on MODE      none or candidates (scan/check only; default none)
  --output PATH       Write JSON evidence bundle (proof only; refuses overwrite)
  --help              Show this help

Exit codes: 0 completed; 1 candidates found with --fail-on candidates
            or unsuccessful experiment/proof/verification;
            2 invalid arguments or other CLI error.

Only AST-based JavaScript/TypeScript candidate rules are shipped.
E1 and E2/E3 demos execute only bundled, allowlisted fixtures.
E2/E3 proofs for arbitrary external projects are NOT supported.`;

function parse(argv) {
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) return { help: true };
  const [command, ...args] = argv;
  if (!['scan', 'check', 'experiment', 'proof', 'verify', 'study'].includes(command)) throw new Error(`Unknown command: ${command}`);
  const opts = { command, target: '.', format: 'text', failOn: 'none' };
  let targetSet = false;
  let failOnSet = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const key = arg.split('=')[0];
    if (['--format', '--fail-on', '--max-files', '--max-bytes', '--output'].includes(key)) {
      const val = arg.includes('=') ? arg.slice(key.length + 1) : args[++i];
      if (!val) throw new Error(`Missing value for ${key}`);
      if (key === '--format') opts.format = val;
      if (key === '--fail-on') { opts.failOn = val; failOnSet = true; }
      if (key === '--output') opts.output = val;
      if (key === '--max-files' || key === '--max-bytes') {
        if (!/^[1-9]\d*$/.test(val) || !Number.isSafeInteger(Number(val))) throw new Error(`Invalid positive integer for ${key}: ${val}`);
        opts[key === '--max-files' ? 'maxFiles' : 'maxBytes'] = Number(val);
      }
    } else if (command === 'experiment' && arg === '--all') {
      if (targetSet) throw new Error('Choose one experiment or --all');
      opts.target = 'all'; targetSet = true;
    } else if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
    else if (targetSet) throw new Error('Specify only one target');
    else { opts.target = arg; targetSet = true; }
  }
  if (!['text', 'json'].includes(opts.format)) throw new Error('--format must be text or json');
  if (!['none', 'candidates'].includes(opts.failOn)) throw new Error('--fail-on must be none or candidates');
  if ((command === 'experiment' || command === 'proof' || command === 'verify' || command === 'study') &&
      ('maxFiles' in opts || 'maxBytes' in opts || failOnSet)) {
    throw new Error('Scan-only options are only available with scan or check');
  }
  if (command !== 'proof' && 'output' in opts) throw new Error('--output is only available with proof');
  if (command === 'experiment' && !targetSet) throw new Error('Choose an experiment: GP001, GP002, or --all');
  if (command === 'proof' && !targetSet) throw new Error('Choose a bundled proof: BW001');
  if (command === 'verify' && !targetSet) throw new Error('Choose an evidence JSON file to verify');
  if (command === 'study' && targetSet) throw new Error('Pinned study accepts no custom target');
  return opts;
}

function printScan(report) {
  console.log(`Ghostproof 0.6 [TypeScript AST] | ${report.summary.scannedFiles} files scanned | ${report.summary.candidates} E0 candidates | 0 confirmed`);
  for (const item of report.findings) {
    console.log(`\n${item.path}:${item.line}:${item.column}  ${item.ruleId} [E0 candidate] ${item.title}`);
    console.log(`  ${item.excerpt}`);
    console.log(`  ${item.guidance}`);
  }
  if (report.summary.skippedLarge) console.log(`\nSkipped ${report.summary.skippedLarge} oversized file(s).`);
  if (report.summary.skippedParseErrors) console.log(`\nSkipped ${report.summary.skippedParseErrors} file(s) with parsing diagnostics.`);
  console.log('\nE0 candidates require validation. No project bug has been reproduced by this scan.');
}

function printProjectProof(report) {
  console.log(`Ghostproof 0.6 — ${report.caseId} bundled project evidence`);
  console.log(`E2: ${report.e2.reproduced ? 'PASS' : 'FAIL'} | sample project contract violation reproduced`);
  console.log(`E3: ${report.e3.regressionGuarded ? 'PASS' : 'FAIL'} | same test RED before / GREEN after`);
  console.log('This demonstration does not establish a defect in any external project.');
}

function printExperiments(report) {
  console.log('Ghostproof 0.6 — built-in E1 language-mechanism experiments');
  for (const exp of report.experiments) {
    console.log(`${exp.ruleId}: ${exp.observed ? 'PASS' : 'FAIL'} | ${exp.mechanism ?? exp.error}`);
  }
  console.log('\nThese isolated E1 results do NOT confirm a defect in any real project.');
}

try {
  const opts = parse(process.argv.slice(2));
  if (opts.help) { console.log(HELP); process.exit(0); }
  if (opts.command === 'study') {
    const report = await runPinnedStudy();
    if (opts.format === 'json') console.log(JSON.stringify(report, null, 2));
    else {
      console.log('Ghostproof 0.6 public E0 study | ' + report.summary.scannedFiles + ' files | ' + report.summary.candidates + ' candidates | 0 confirmed');
      for (const entry of report.results) {
        console.log('\n' + entry.repository + '@' + entry.commit.slice(0,12) + ' ' + entry.path + ': ' + entry.candidateCount + ' candidates');
        for (const finding of entry.findings) console.log('  ' + finding.path + ':' + finding.line + ':' + finding.column + ' ' + finding.ruleId + ' [E0]');
      }
      console.log('No external code executed or project defect confirmed.');
    }
  } else if (opts.command === 'experiment') {
    const report = runExperiments(opts.target);
    if (opts.format === 'json') console.log(JSON.stringify(report, null, 2));
    else printExperiments(report);
    if (!report.passed) process.exitCode = 1;
  } else if (opts.command === 'verify') {
    const result = await verifyEvidenceFile(opts.target);
    if (opts.format === 'json') console.log(JSON.stringify(result, null, 2));
    else {
      console.log(`Ghostproof 0.6 — BW001 evidence verification: ${result.passed ? 'PASS' : 'FAIL'}`);
      console.log(result.passed ? 'Pinned fixtures match; deterministic bundled E2/E3 replay agrees with the supplied JSON.' : result.reason);
      console.log('No external-project bug was confirmed.');
    }
    if (!result.passed) process.exitCode = 1;
  } else if (opts.command === 'proof') {
    const report = runProjectProof(opts.target);
    if (opts.output) await writeFile(opts.output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    if (opts.format === 'json') console.log(JSON.stringify(report, null, 2));
    else printProjectProof(report);
    if (opts.output) console.error(`Evidence bundle written to ${opts.output}`);
    if (!report.passed) process.exitCode = 1;
  } else {
    const report = await scanPath(opts.target, opts);
    if (opts.format === 'json') console.log(JSON.stringify(report, null, 2));
    else printScan(report);
    if (opts.failOn === 'candidates' && report.summary.candidates > 0) process.exitCode = 1;
  }
} catch (error) {
  console.error(`ghostproof: ${error.message}`);
  process.exitCode = 2;
}
