import { createHash } from 'node:crypto';
import { readdir, readFile, lstat, stat } from 'node:fs/promises';
import path from 'node:path';
import { RULES } from './rules.mjs';

const EXTENSIONS = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx']);
const SKIP_DIRS = new Set([
  '.git', 'node_modules', '.next', '.nuxt', '.turbo', '.venv', 'venv',
  'dist', 'build', 'coverage', 'target', 'vendor', '.cache',
]);

// Ignore ordinary quoted content, comments, and template literals. This is a
// lightweight lexer, not a full JS/TS parser (notably regex literals and JSX).
export function maskNonCode(source) {
  const chars = source.split('');
  const masked = chars.slice();
  const erase = (index) => { if (chars[index] !== '\n' && chars[index] !== '\r') masked[index] = ' '; };
  let i = 0;
  while (i < chars.length) {
    const c = chars[i];
    const next = chars[i + 1];
    if (c === '/' && next === '/') {
      erase(i++); erase(i++);
      while (i < chars.length && chars[i] !== '\n') erase(i++);
      continue;
    }
    if (c === '/' && next === '*') {
      erase(i++); erase(i++);
      while (i < chars.length) {
        if (chars[i] === '*' && chars[i + 1] === '/') { erase(i++); erase(i++); break; }
        erase(i++);
      }
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      const quote = c;
      erase(i++);
      while (i < chars.length) {
        if (chars[i] === '\\') { erase(i++); if (i < chars.length) erase(i++); continue; }
        const end = chars[i] === quote;
        erase(i++);
        if (end) break;
      }
      continue;
    }
    i++;
  }
  return masked.join('');
}

function location(source, offset) {
  const before = source.slice(0, offset);
  const line = before.split('\n').length;
  const lastLineBreak = before.lastIndexOf('\n');
  return { line, column: offset - lastLineBreak };
}

export function scanText(source, relativePath = 'input.js') {
  const visible = maskNonCode(source);
  const findings = [];
  for (const rule of RULES) {
    const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
    for (const match of visible.matchAll(pattern)) {
      const at = location(source, match.index);
      const excerpt = source.split('\n')[at.line - 1]?.trim().slice(0, 180) ?? '';
      findings.push({
        ruleId: rule.id,
        title: rule.title,
        level: 'E0',
        classification: 'candidate',
        path: relativePath.split(path.sep).join('/'),
        ...at,
        fingerprint: createHash('sha256').update(`${rule.id}\0${relativePath}\0${at.line}\0${excerpt}`).digest('hex').slice(0, 16),
        excerpt,
        explanation: rule.explanation,
        guidance: rule.guidance,
      });
    }
  }
  return findings.sort((a, b) => a.line - b.line || a.column - b.column || a.ruleId.localeCompare(b.ruleId));
}

/** No target code is ever executed or imported by the scanner. */
export async function scanPath(target, options = {}) {
  const root = path.resolve(target);
  const maxFiles = options.maxFiles ?? 2000;
  const maxBytes = options.maxBytes ?? 512 * 1024;
  const files = [];
  const stats = { visitedFiles: 0, scannedFiles: 0, skippedLarge: 0, skippedUnsupported: 0, skippedSymlinks: 0 };
  const info = await lstat(root);
  if (info.isDirectory()) {
    const visit = async (folder) => {
      for (const entry of (await readdir(folder, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
        const full = path.join(folder, entry.name);
        if (entry.isSymbolicLink()) { stats.skippedSymlinks++; continue; }
        if (entry.isDirectory()) { if (!SKIP_DIRS.has(entry.name)) await visit(full); continue; }
        if (!entry.isFile()) continue;
        if (!EXTENSIONS.has(path.extname(entry.name).toLowerCase())) { stats.skippedUnsupported++; continue; }
        files.push(full);
        if (files.length > maxFiles) throw new Error(`File limit exceeded (${maxFiles}); narrow the scan or raise --max-files`);
      }
    };
    await visit(root);
  } else if (info.isFile()) {
    if (!EXTENSIONS.has(path.extname(root).toLowerCase())) throw new Error('Unsupported input extension');
    files.push(root);
  } else throw new Error('Input must be a regular file or directory');

  const findings = [];
  for (const file of files) {
    stats.visitedFiles++;
    const fileInfo = await stat(file);
    if (fileInfo.size > maxBytes) { stats.skippedLarge++; continue; }
    const content = await readFile(file, 'utf8');
    stats.scannedFiles++;
    findings.push(...scanText(content, path.relative(info.isDirectory() ? root : path.dirname(root), file)));
  }
  findings.sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line || a.column - b.column || a.ruleId.localeCompare(b.ruleId));
  return {
    schemaVersion: '0.1',
    tool: { name: 'ghostproof', version: '0.1.0' },
    target: root,
    summary: { ...stats, candidates: findings.length, confirmed: 0 },
    findings,
    notes: [
      'All findings are E0 static candidates, not confirmed project bugs.',
      'The scanner does not execute target files or generate project-specific regression tests.',
      'Heuristic patterns can miss cases and produce false positives; review each finding.',
    ],
  };
}
