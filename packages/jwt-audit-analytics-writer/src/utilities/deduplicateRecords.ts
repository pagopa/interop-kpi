import { Logger } from "pagopa-interop-kpi-commons";
import { GeneratedTokenAuditDetails } from "../model/domain/models.js";

/**
 * Deduplicates an array of GeneratedTokenAuditDetails records based on their `jwtId`.
 * If a `jwtId` appears more than once in the batch, all occurrences of that `jwtId` are removed.
 * Records with unique `jwtId`s are retained.
 *
 * @param batch - The array of `GeneratedTokenAuditDetails` records to deduplicate.
 * @param logger - An instance of a logger to log warnings about removed duplicates.
 * @returns A new array containing only the unique `GeneratedTokenAuditDetails` records.
 */
export function deduplicateJwtIdRecords(
  batch: GeneratedTokenAuditDetails[],
  logger: Logger
): GeneratedTokenAuditDetails[] {
  const jwtIdCounts = new Map<string, number>();
  const duplicateJwtIds = new Set<string>();

  batch.forEach((record) => {
    const jwtId = record.jwtId;
    jwtIdCounts.set(jwtId, (jwtIdCounts.get(jwtId) || 0) + 1);
  });

  const uniqueRecords = batch.filter(
    (record) => jwtIdCounts.get(record.jwtId) === 1
  );
  jwtIdCounts.forEach((count, jwtId) => {
    if (count > 1) {
      duplicateJwtIds.add(jwtId);
    }
  });

  if (uniqueRecords.length < batch.length) {
    logger.warn(
      `Detected and removed ${
        batch.length - uniqueRecords.length
      } duplicate records in the batch. jwt_id: [${Array.from(
        duplicateJwtIds
      ).join(", ")}]`
    );
  }
  return uniqueRecords;
}
