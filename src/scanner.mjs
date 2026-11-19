import { createHash } from 'node:crypto';
import { readdir, readFile, lstat } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import { RULES } from './rules.mjs';

const EXTENSIONS = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx']);
const SKIP_DIRS = new Set([
  '.git', 'node_modules', '.next', '.nuxt', '.turbo', '.venv', 'venv',
  'dist', 'build', 'coverage', 'target', 'vendor', '.cache',
]);
const SEVERITY = { level: 'E0', classification: 'candidate' };

function scriptKind(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.tsx') return ts.ScriptKind.TSX;
  if (extension === '.jsx') return ts.ScriptKind.JSX;
  if (extension === '.ts') return ts.ScriptKind.TS;
  return ts.ScriptKind.JS;
}

function unwrapExpression(node) {
  while (
    ts.isParenthesizedExpression(node) || ts.isAsExpression(node) ||
    ts.isTypeAssertionExpression(node) || ts.isNonNullExpression(node) ||
    (ts.isSatisfiesExpression && ts.isSatisfiesExpression(node))
  ) node = node.expression;
  return node;
}

function isAsyncFunction(node) {
  if (!node) return false;
  const value = unwrapExpression(node);
  return (ts.isArrowFunction(value) || ts.isFunctionExpression(value)) &&
    Boolean(value.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword));
}

/**
 * An async block with only synchronous statements (such as console.log) does
 * not demonstrate the forEach completion hazard. Keep E0 candidates when the
 * callback awaits, throws, or explicitly returns a value/thenable. Expression-
 * bodied arrows also return a value and remain candidates. This is a bounded
 * precision heuristic, not type-aware proof of a Promise or an absence of bugs.
 *
 * Limitation: a callback that starts unawaited async work and returns void can
 * be missed; that issue is independent of awaiting the async callback itself.
 */
function hasObservableAsyncCompletion(callback) {
  const fn = unwrapExpression(callback);
  if (!ts.isArrowFunction(fn) && !ts.isFunctionExpression(fn)) return false;
  if (!ts.isBlock(fn.body)) return true;
  let relevant = false;
  function inspect(node) {
    if (relevant) return;
    if (node !== fn.body && ts.isFunctionLike(node)) return; // nested function, different callback
    if (ts.isAwaitExpression(node) || ts.isThrowStatement(node) ||
        (ts.isReturnStatement(node) && node.expression) ||
        (ts.isForOfStatement(node) && node.awaitModifier)) {
      relevant = true;
      return;
    }
    ts.forEachChild(node, inspect);
  }
  inspect(fn.body);
  return relevant;
}

function callName(expression) {
  const node = unwrapExpression(expression);
  if (ts.isPropertyAccessExpression(node)) return node.name.text;
  if (ts.isElementAccessExpression(node) && ts.isStringLiteralLike(node.argumentExpression)) {
    return node.argumentExpression.text;
  }
  return null;
}

export function analyzeSource(source, relativePath = 'input.js') {
  const file = ts.createSourceFile(relativePath, source, ts.ScriptTarget.Latest, true, scriptKind(relativePath));
  const diagnostics = file.parseDiagnostics.map(d => {
    const position = file.getLineAndCharacterOfPosition(d.start ?? 0);
    return {
      path: relativePath.split(path.sep).join('/'),
      line: position.line + 1,
      column: position.character + 1,
      code: d.code,
      message: ts.flattenDiagnosticMessageText(d.messageText, ' '),
    };
  });
  // Never treat syntactically malformed source as a dependable detection result.
  if (diagnostics.length) return { findings: [], diagnostics };
  const findings = [];
  const lines = source.split(/\r?\n/);
  function add(ruleId, node) {
    const rule = RULES[ruleId];
    const offset = node.getStart(file);
    const at = file.getLineAndCharacterOfPosition(offset);
    const line = at.line + 1;
    const column = at.character + 1;
    const excerpt = (lines[at.line] ?? '').trim().slice(0, 180);
    const normalizedPath = relativePath.split(path.sep).join('/');
    findings.push({
      ruleId,
      title: rule.title,
      ...SEVERITY,
      path: normalizedPath,
      line,
      column,
      fingerprint: createHash('sha256')
        .update(`${ruleId}\0${normalizedPath}\0${line}\0${excerpt}`)
        .digest('hex').slice(0, 16),
      excerpt,
      explanation: rule.explanation,
      guidance: rule.guidance,
    });
  }
  function visit(node) {
    if (ts.isCallExpression(node) && callName(node.expression) === 'forEach' &&
        isAsyncFunction(node.arguments[0]) && hasObservableAsyncCompletion(node.arguments[0])) {
      add('GP001', node);
    }
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) &&
        node.expression.text === 'Promise' && isAsyncFunction(node.arguments?.[0])) {
      add('GP002', node);
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return {
    findings: findings.sort((a, b) => a.line - b.line || a.column - b.column || a.ruleId.localeCompare(b.ruleId)),
    diagnostics: [],
  };
}

/** Return E0 findings; project behavior is not executed or inferred. */
export function scanText(source, relativePath = 'input.js') {
  return analyzeSource(source, relativePath).findings;
}

/** Read only. Never imports, compiles or executes files from target. */
export async function scanPath(target, options = {}) {
  const root = path.resolve(target);
  const maxFiles = options.maxFiles ?? 2000;
  const maxBytes = options.maxBytes ?? 512 * 1024;
  const files = [];
  const summary = {
    visitedFiles: 0, scannedFiles: 0, skippedLarge: 0,
    skippedUnsupported: 0, skippedSymlinks: 0,
    skippedParseErrors: 0, candidates: 0, confirmed: 0,
  };
  const rootInfo = await lstat(root);
  if (rootInfo.isDirectory()) {
    const visit = async (folder) => {
      const entries = (await readdir(folder, { withFileTypes: true }))
        .sort((a, b) => a.name.localeCompare(b.name));
      for (const entry of entries) {
        const full = path.join(folder, entry.name);
        if (entry.isSymbolicLink()) { summary.skippedSymlinks++; continue; }
        if (entry.isDirectory()) { if (!SKIP_DIRS.has(entry.name)) await visit(full); continue; }
        if (!entry.isFile()) continue;
        if (!EXTENSIONS.has(path.extname(entry.name).toLowerCase())) { summary.skippedUnsupported++; continue; }
        files.push(full);
        if (files.length > maxFiles) throw new Error(`File limit exceeded (${maxFiles}); narrow the scan or raise --max-files`);
      }
    };
    await visit(root);
  } else if (rootInfo.isFile()) {
    if (!EXTENSIONS.has(path.extname(root).toLowerCase())) throw new Error('Unsupported input extension');
    files.push(root);
  } else throw new Error('Input must be a regular file or directory');

  const findings = [];
  const diagnostics = [];
  for (const filePath of files) {
    summary.visitedFiles++;
    // Avoid following an entry if it was replaced with a symlink after enumeration.
    const info = await lstat(filePath);
    if (info.isSymbolicLink()) { summary.skippedSymlinks++; continue; }
    if (!info.isFile()) { summary.skippedUnsupported++; continue; }
    if (info.size > maxBytes) { summary.skippedLarge++; continue; }
    const source = await readFile(filePath, 'utf8');
    const relativePath = path.relative(rootInfo.isDirectory() ? root : path.dirname(root), filePath);
    const result = analyzeSource(source, relativePath);
    if (result.diagnostics.length) {
      summary.skippedParseErrors++;
      diagnostics.push(...result.diagnostics.slice(0, 5));
      continue;
    }
    summary.scannedFiles++;
    findings.push(...result.findings);
  }
  findings.sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line || a.column - b.column || a.ruleId.localeCompare(b.ruleId));
  summary.candidates = findings.length;
  return {
    schemaVersion: '0.5',
    tool: { name: 'ghostproof', version: '0.5.0', engine: 'typescript-ast' },
    target: root,
    summary,
    findings,
    diagnostics,
    notes: [
      'E0 findings are static candidates, never verified project bugs.',
      'AST matching does not prove a fault in the surrounding control flow.',
      'Scanned code is read but never executed; isolated E1 demos run our own built-in fixtures only.',
    ],
  };
}
