/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { FileManager, Logger } from "pagopa-interop-kpi-commons";
import { AlbLogsAuditDetails } from "pagopa-interop-kpi-models";
import { config } from "../config/config.js";
import { DBService } from "./dbService.js";

export const albLogsAuditServiceBuilder = (
  dbService: DBService,
  fileManager: FileManager
) => ({
  async handleMessage(s3key: string, logger: Logger): Promise<void> {
    const fileStream = await fileManager.get(config.s3Bucket, s3key, logger);

    logger.info(`Reading and processing alb logs audit file: ${s3key}`);

    for await (const batch of batchGenerator(fileStream, 500, logger, s3key)) {
      await dbService.insertStagingRecords(batch);
    }

    await dbService.mergeData();
  },
});

export type AlbLogsAuditService = ReturnType<typeof albLogsAuditServiceBuilder>;

async function* batchGenerator(
  source: AsyncIterable<unknown>,
  batchSize: number,
  logger: Logger,
  s3KeyPath: string
): AsyncGenerator<AlbLogsAuditDetails[]> {
  // eslint-disable-next-line functional/no-let
  let batch: AlbLogsAuditDetails[] = [];
  for await (const rawRecord of source) {
    const result = AlbLogsAuditDetails.safeParse(rawRecord);
    if (result.success) {
      // eslint-disable-next-line functional/immutable-data
      batch.push(result.data);
    } else {
      logger.error(
        `Invalid record for file: ${s3KeyPath}. Data: ${JSON.stringify(
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
