/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { FileManager, Logger } from "pagopa-interop-kpi-commons";
import { GeneratedTokenAuditDetails } from "pagopa-interop-kpi-models";
import * as ndjson from "ndjson";
import { config } from "../config/config.js";
import { DBService } from "./dbService.js";

export const jwtAuditServiceBuilder = (
  dbService: DBService,
  fileManager: FileManager
) => ({
  async handleMessage(s3key: string, logger: Logger): Promise<void> {
    const fileStream = await fileManager.get(config.s3Bucket, s3key, logger);
    const parsedFileStream = fileStream.pipe(ndjson.parse());

    logger.info(`Processing jwt audit file: ${s3key}`);

    for await (const batch of batchGenerator(
      parsedFileStream,
      config.batchSize,
      logger,
      s3key
    )) {
      logger.debug(
        `Inserting batch of ${batch.length} records for file: ${s3key}`
      );
      await dbService.insertStagingRecords(batch);
    }

    logger.info(`Staging records inserted successfully for file: ${s3key}`);

    await dbService.mergeData();

    logger.info(`Merge operation completed successfully for file: ${s3key}`);
  },
});

export type JwtAuditService = ReturnType<typeof jwtAuditServiceBuilder>;

async function* batchGenerator(
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
