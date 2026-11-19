/**
 * Heuristic syntax signatures only. A match is an E0 candidate, never a
 * reproduced project bug. Extend via parsers and project tests later.
 */
export const RULES = Object.freeze([
  {
    id: 'GP001',
    title: 'Async callback passed to forEach',
    explanation: 'Array.forEach does not await returned promises. Async work may still be running after the loop returns.',
    guidance: 'Check whether the caller relies on completion. Consider for...of with await or Promise.all with map.',
    pattern: /\.forEach\s*\(\s*async\s*(?:function\b|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)/g,
  },
  {
    id: 'GP002',
    title: 'Async Promise executor',
    explanation: 'A throw after await in an async Promise executor may not reject the outer Promise, leaving it pending.',
    guidance: 'Prefer a non-async executor or use an async function directly; verify the intended error propagation.',
    pattern: /\bnew\s+Promise\s*(?:<[^>\n]*>\s*)?\(\s*async\s*(?:function\b|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)/g,
  },
]);
