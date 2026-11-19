// Deliberately defective bundled sample project (GP001).
// Contract: do not confirm completion until every record is persisted.
export async function persistBatch(records, persist) {
  records.forEach(async (record) => {
    await persist(record);
  });
}
