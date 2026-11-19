#!/usr/bin/env node
import { scanPath } from '../src/scanner.mjs';

const HELP = `Ghostproof v0.1 — evidence-first candidate detection

Usage:
  ghostproof scan [path] [--format text|json] [--fail-on candidates|none]
  ghostproof check [path] [--format text|json] [--fail-on candidates|none]

Options:
  --max-files N       Maximum source files (default 2000)
  --max-bytes N       Maximum bytes per source file (default 524288)
  --help              Show this help

Exit codes: 0 completed; 1 candidates found with --fail-on candidates;
            2 invalid arguments or scan error.

Only JavaScript/TypeScript candidate heuristics are supported in v0.1.
No target code is executed. All findings are E0, not verified defects.`;

function parse(argv) {
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) return { help: true };
  const [command, ...args] = argv;
  if (!['scan', 'check'].includes(command)) throw new Error(`Unknown command: ${command}`);
  const opts = { target: '.', format: 'text', failOn: 'none' };
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
    } else if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
    else if (targetSet) throw new Error('Specify only one path');
    else { opts.target = arg; targetSet = true; }
  }
  if (!['text', 'json'].includes(opts.format)) throw new Error('--format must be text or json');
  if (!['none', 'candidates'].includes(opts.failOn)) throw new Error('--fail-on must be none or candidates');
  return opts;
}

function printText(report) {
  console.log(`Ghostproof 0.1 | ${report.summary.scannedFiles} files scanned | ${report.summary.candidates} E0 candidates | 0 confirmed`);
  for (const item of report.findings) {
    console.log(`\n${item.path}:${item.line}:${item.column}  ${item.ruleId} [E0 candidate] ${item.title}`);
    console.log(`  ${item.excerpt}`);
    console.log(`  ${item.guidance}`);
  }
  if (report.summary.skippedLarge) console.log(`\nSkipped ${report.summary.skippedLarge} oversized file(s).`);
  console.log('\nE0 candidates require validation. No project bug has been reproduced by this scan.');
}

try {
  const options = parse(process.argv.slice(2));
  if (options.help) { console.log(HELP); process.exit(0); }
  const result = await scanPath(options.target, options);
  if (options.format === 'json') console.log(JSON.stringify(result, null, 2));
  else printText(result);
  if (options.failOn === 'candidates' && result.summary.candidates > 0) process.exitCode = 1;
} catch (error) {
  console.error(`ghostproof: ${error.message}`);
  process.exitCode = 2;
}
