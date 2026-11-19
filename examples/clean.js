export async function processJobs(tasks, save) {
  for (const task of tasks) await save(task);
}
export async function returnValue() {
  return await Promise.resolve(42);
}
