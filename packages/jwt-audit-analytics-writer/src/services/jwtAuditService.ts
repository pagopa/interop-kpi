/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { FileManager, Logger } from "pagopa-interop-kpi-commons";
import * as ndjson from "ndjson";
import { config } from "../config/config.js";
import { batches } from "../utilities/batchHelper.js";
import { DBService } from "./dbService.js";

export const jwtAuditServiceBuilder = (
  dbService: DBService,
  fileManager: FileManager
) => ({
  async handleMessage(s3key: string, logger: Logger): Promise<void> {
    const fileStream = await fileManager.get(config.s3Bucket, s3key, logger);
    const parsedFileStream = fileStream.pipe(ndjson.parse());

    logger.info(`Processing jwt audit file: ${s3key}`);

    for await (const batch of batches(
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

    await dbService.deduplicateStagingRecords();
    await dbService.mergeData();

    logger.info(`Merge operation completed successfully for file: ${s3key}`);
  },
});

export type JwtAuditService = ReturnType<typeof jwtAuditServiceBuilder>;
