import { Logger } from "pagopa-interop-kpi-commons";
import { ZodSchema } from "zod";

/**
 * Async generator that batches records from an asynchronous iterable.
 *
 * This function reads from the provided source stream and groups valid records into batches
 * of a specified size. Each record is validated and parsed using the provided Zod schema.
 * If a record fails validation, an error is logged.
 *
 * @param schema - A Zod schema used to validate and parse each raw record.
 * @param source - The async iterable source providing raw records.
 * @param batchSize - The maximum number of records per batch.
 * @param fileName - Identifier for the source file, used for logging purposes.
 * @param logger - Logger instance.
 * @returns An async generator yielding batches (arrays) of parsed records of type TSchema.
 */
export async function* batches<TSchema>(
  schema: ZodSchema<TSchema>,
  source: AsyncIterable<unknown>,
  batchSize: number,
  fileName: string,
  logger: Logger
): AsyncGenerator<TSchema[]> {
  // eslint-disable-next-line functional/no-let
  let batch: TSchema[] = [];
  for await (const rawRecord of source) {
    const result = schema.safeParse(rawRecord);
    if (result.success) {
      // eslint-disable-next-line functional/immutable-data
      batch.push(result.data);
    } else {
      logger.error(
        `Invalid record for file: ${fileName}. Data: ${JSON.stringify(
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
