// Repository-owned, controlled mechanism demonstration: no target code is imported.
const completed = [];
let release;
const barrier = new Promise(resolve => { release = resolve; });
[1, 2].forEach(async item => {
  await barrier;
  completed.push(item);
});
const completedImmediately = completed.length;
release();
await new Promise(resolve => setImmediate(resolve));
const completedAfterRelease = completed.length;
console.log(JSON.stringify({
  mechanism: 'forEach does not await returned async callbacks',
  completedImmediately,
  completedAfterRelease,
  observed: completedImmediately === 0 && completedAfterRelease === 2,
}));
