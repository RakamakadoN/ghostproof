// Examples of patterns worth reviewing. These are NOT confirmed app defects.
export function enqueueJobs(tasks, save) {
  tasks.forEach(async (task) => {
    await save(task);
  });
  // If callers expect all jobs to have completed here, investigate GP001.
}

export function badPromise() {
  return new Promise(async (resolve) => {
    await Promise.resolve();
    resolve(42);
  });
  // If errors occur after await, investigate GP002.
}
