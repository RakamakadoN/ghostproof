// Repository-owned, controlled mechanism demonstration: no target code is imported.
let unhandled = null;
let outerState = 'pending';
const expectedMessage = 'ghostproof-GP002-controlled';
process.once('unhandledRejection', reason => { unhandled = String(reason?.message ?? reason); });
const outer = new Promise(async resolve => {
  await Promise.resolve();
  throw new Error(expectedMessage);
});
outer.then(() => { outerState = 'fulfilled'; }, () => { outerState = 'rejected'; });
await new Promise(resolve => setTimeout(resolve, 30));
console.log(JSON.stringify({
  mechanism: 'async Promise executor rejection does not settle the outer Promise',
  outerState,
  unhandledRejectionObserved: unhandled === expectedMessage,
  observed: outerState === 'pending' && unhandled === expectedMessage,
}));
