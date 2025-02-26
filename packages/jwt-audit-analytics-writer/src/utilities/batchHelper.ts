import { Logger } from "pagopa-interop-kpi-commons";
import { GeneratedTokenAuditDetails } from "pagopa-interop-kpi-models";

/**
 * Async generator that batches records from an asynchronous iterable.
 *
 * This function reads from the provided source stream and groups valid records into batches
 * of a specified size. If a record fails validation (using GeneratedTokenAuditDetails.safeParse),
 * an error is logged.
 *
 * @param source - The async iterable source providing raw records.
 * @param batchSize - The maximum number of records per batch.
 * @param logger - Logger instance to record errors.
 * @param s3key - Identifier for the source file, used for logging purpose.
 * @returns An async generator yielding batches (arrays) of GeneratedTokenAuditDetails.
 */
export async function* batches(
  source: AsyncIterable<unknown>,
  batchSize: number,
  logger: Logger,
  s3key: string
): AsyncGenerator<GeneratedTokenAuditDetails[]> {
  // eslint-disable-next-line functional/no-let
  let batch: GeneratedTokenAuditDetails[] = [];
  for await (const rawRecord of source) {
    const result = GeneratedTokenAuditDetails.safeParse(rawRecord);
    if (result.success) {
      // eslint-disable-next-line functional/immutable-data
      batch.push(result.data);
    } else {
      logger.error(
        `Invalid record for file: ${s3key}. Data: ${JSON.stringify(
          rawRecord
        )}. Details: ${JSON.stringify(result.error)}`
      );
    }
    if (batch.length >= batchSize) {
      yield batch;
      batch = [];
    }
  }
  if (batch.length > 0) {
    yield batch;
  }
}
