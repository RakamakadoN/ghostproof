/** Rule definitions are hypotheses, not guaranteed defects. */
export const RULES = Object.freeze({
  GP001: {
    id: 'GP001',
    title: 'Async callback passed to forEach',
    explanation: 'Array.forEach does not await returned promises. If completion is required, async callbacks may still be running when the call returns.',
    guidance: 'Verify whether the caller requires completion. Consider for...of with await or Promise.all(items.map(...)).',
  },
  GP002: {
    id: 'GP002',
    title: 'Async Promise executor',
    explanation: 'A throw after await in an async Promise executor does not reject the outer Promise; it may remain pending.',
    guidance: 'Use a synchronous Promise executor or return an async function directly. Verify error propagation.',
  },
});
