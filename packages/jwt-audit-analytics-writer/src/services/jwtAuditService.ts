/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { FileManager, Logger } from "pagopa-interop-kpi-commons";
import * as ndjson from "ndjson";
import { config } from "../config/config.js";
import { batches } from "../utilities/batchHelper.js";
import {
  GeneratedTokenAuditDetails,
  tokenAuditSchema,
} from "../model/domain/models.js";
import { DBService } from "./dbService.js";

export const jwtAuditServiceBuilder = (
  dbService: DBService,
  fileManager: FileManager
) => ({
  async handleMessage(s3key: string, logger: Logger): Promise<void> {
    const fileStream = await fileManager.get(config.s3Bucket, s3key, logger);
    const parsedFileStream = fileStream.pipe(ndjson.parse());

    logger.info(`Processing records for file: ${s3key}`);

    for await (const batch of batches<GeneratedTokenAuditDetails>(
      tokenAuditSchema,
      parsedFileStream,
      config.batchSize,
      s3key,
      logger
    )) {
      await dbService.insertRecordsToStaging(batch);
    }

    logger.info(`Staging records insertion completed for file: ${s3key}`);

    await dbService.mergeStagingToTarget();

    logger.info(`Staging data merged into target tables for file: ${s3key}`);

    await dbService.cleanStaging();

    logger.info(`Staging cleanup completed for file: ${s3key}`);
  },
});

export type JwtAuditService = ReturnType<typeof jwtAuditServiceBuilder>;

async function* batchGenerator(
  source: AsyncIterable<unknown>,
  batchSize: number,
  logger: Logger,
  s3KeyPath: string
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
