#!/usr/bin/env node
import { scanPath } from '../src/scanner.mjs';
import { runExperiments } from '../src/experiments.mjs';

const HELP = `Ghostproof v0.2 — evidence-first candidate detection and isolated mechanism experiments

Usage:
  ghostproof scan [path] [--format text|json] [--fail-on candidates|none]
  ghostproof check [path] [--format text|json] [--fail-on candidates|none]
  ghostproof experiment GP001|GP002|--all [--format text|json]

Options:
  --max-files N       Maximum source files (default 2000)
  --max-bytes N       Maximum bytes per source file (default 524288)
  --help              Show this help

Exit codes: 0 completed; 1 candidates found with --fail-on candidates
            or experiment failed; 2 invalid arguments or scan error.

Only AST-based JavaScript/TypeScript candidate rules are shipped.
Experiments execute bundled fixtures, NEVER target project code.
No automated E2/E3 project verification is claimed.`;

function parse(argv) {
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) return { help: true };
  const [command, ...args] = argv;
  if (!['scan', 'check', 'experiment'].includes(command)) throw new Error(`Unknown command: ${command}`);
  const opts = { command, target: '.', format: 'text', failOn: 'none' };
  let targetSet = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const key = arg.split('=')[0];
    if (['--format', '--fail-on', '--max-files', '--max-bytes'].includes(key)) {
      const val = arg.includes('=') ? arg.slice(key.length + 1) : args[++i];
      if (!val) throw new Error(`Missing value for ${key}`);
      if (key === '--format') opts.format = val;
      if (key === '--fail-on') opts.failOn = val;
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
  if (command === 'experiment' && ('maxFiles' in opts || 'maxBytes' in opts || opts.failOn !== 'none')) {
    throw new Error('Scan-only options cannot be used with experiment');
  }
  if (command === 'experiment' && !targetSet) throw new Error('Choose an experiment: GP001, GP002, or --all');
  return opts;
}

function printScan(report) {
  console.log(`Ghostproof 0.2 [TypeScript AST] | ${report.summary.scannedFiles} files scanned | ${report.summary.candidates} E0 candidates | 0 confirmed`);
  for (const item of report.findings) {
    console.log(`\n${item.path}:${item.line}:${item.column}  ${item.ruleId} [E0 candidate] ${item.title}`);
    console.log(`  ${item.excerpt}`);
    console.log(`  ${item.guidance}`);
  }
  if (report.summary.skippedLarge) console.log(`\nSkipped ${report.summary.skippedLarge} oversized file(s).`);
  if (report.summary.skippedParseErrors) console.log(`\nSkipped ${report.summary.skippedParseErrors} file(s) with parsing diagnostics.`);
  console.log('\nE0 candidates require validation. No project bug has been reproduced by this scan.');
}

function printExperiments(report) {
  console.log('Ghostproof 0.2 — built-in E1 language-mechanism experiments');
  for (const exp of report.experiments) {
    console.log(`${exp.ruleId}: ${exp.observed ? 'PASS' : 'FAIL'} | ${exp.mechanism ?? exp.error}`);
  }
  console.log('\nThese isolated E1 results do NOT confirm a defect in any real project.');
}

try {
  const opts = parse(process.argv.slice(2));
  if (opts.help) { console.log(HELP); process.exit(0); }
  if (opts.command === 'experiment') {
    const report = runExperiments(opts.target);
    if (opts.format === 'json') console.log(JSON.stringify(report, null, 2));
    else printExperiments(report);
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
