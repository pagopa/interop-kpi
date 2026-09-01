export const selectRecordsWithDpop = <T extends { dpop?: unknown }>(
  records: T[]
): T[] => records.filter((record) => record.dpop !== undefined);
