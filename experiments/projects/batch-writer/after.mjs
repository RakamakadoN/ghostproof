// Fixed version of the same bundled sample project.
export async function persistBatch(records, persist) {
  for (const record of records) {
    await persist(record);
  }
}
