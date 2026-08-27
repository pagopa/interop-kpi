/* eslint-disable functional/immutable-data */

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
  const uniqueJwtIds = new Set<string>();
  const uniqueRecords: GeneratedTokenAuditDetails[] = [];
  const removedDuplicates: string[] = [];

  for (const record of batch) {
    if (!uniqueJwtIds.has(record.jwtId)) {
      uniqueJwtIds.add(record.jwtId);
      uniqueRecords.push(record);
    } else {
      removedDuplicates.push(record.jwtId);
    }
  }

  if (removedDuplicates.length > 0) {
    logger.warn(
      `Detected and removed ${
        removedDuplicates.length
      } duplicate records in the batch. jwt_id: [${[
        ...new Set(removedDuplicates),
      ].join(", ")}]`
    );
  }

  return uniqueRecords;
}
