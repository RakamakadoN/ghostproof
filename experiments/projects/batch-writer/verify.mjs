/** A single deterministic contract test reused unchanged for before and after. */
const variants = Object.freeze({ before: './before.mjs', after: './after.mjs' });
const variant = process.argv[2];
if (!Object.hasOwn(variants, variant)) {
  console.error('Only bundled variants before/after are allowed');
  process.exitCode = 2;
} else {
  const { persistBatch } = await import(variants[variant]);
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const saved = [];
  const pending = [];
  let settled = false;
  let rejected = false;
  const save = record => {
    const task = gate.then(() => { saved.push(record); });
    pending.push(task);
    return task;
  };
  const work = persistBatch([101, 102], save);
  work.then(() => { settled = true; }, () => { rejected = true; });
  // A fixed number of microtask checkpoints, never a clock-based race.
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  const settledBeforeSaveCompleted = settled;
  const savedBeforeRelease = saved.length;
  release();
  await work;
  await Promise.all(pending);
  await Promise.resolve();
  const finalRecords = [...saved];
  const contractPassed = !settledBeforeSaveCompleted && !rejected &&
    savedBeforeRelease === 0 && finalRecords.join(',') === '101,102';
  process.stdout.write(JSON.stringify({
    testId: 'BW001-COMPLETION', variant, expected: {
      settledBeforeSaveCompleted: false, savedBeforeRelease: 0, finalRecords: [101, 102],
    }, actual: { settledBeforeSaveCompleted, savedBeforeRelease, finalRecords },
    contractPassed,
  }) + '\n');
}
