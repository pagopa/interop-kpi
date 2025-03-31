/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { FileManager, Logger, batches } from "pagopa-interop-kpi-commons";
import * as ndjson from "ndjson";
import { config } from "../config/config.js";
import {
  GeneratedTokenAuditDetails,
  tokenAuditSchema,
} from "../model/domain/models.js";
import { elapsedTime } from "../utilities/loggerHelper.js";
import { DBService } from "./dbService.js";

export const jwtAuditServiceBuilder = (
  dbService: DBService,
  fileManager: FileManager
) => ({
  async handleMessage(s3key: string, logger: Logger): Promise<void> {
    // eslint-disable-next-line functional/no-let
    let totalRecordsProcessed: number = 0;
    const startTime = Date.now();

    try {
      const fileStream = await fileManager.get(config.s3Bucket, s3key, logger);
      const parsedFileStream = fileStream.pipe(ndjson.parse());

      logger.info(
        `${elapsedTime(startTime)} Processing records for file: ${s3key}`
      );

      const batchStartTime = Date.now();
      for await (const batch of batches<GeneratedTokenAuditDetails>(
        tokenAuditSchema,
        parsedFileStream,
        config.batchSize,
        s3key,
        logger
      )) {
        await dbService.insertRecordsToStaging(batch);
        totalRecordsProcessed += batch.length;
      }

      if (totalRecordsProcessed === 0) {
        logger.info(
          `${elapsedTime(
            batchStartTime
          )} No records processed for file: ${s3key}. Skipping merge and cleanup.`
        );
        return;
      }

      logger.info(
        `${elapsedTime(
          batchStartTime
        )} Staging insertion completed with ${totalRecordsProcessed} records processed for file: ${s3key}.`
      );

      const mergeStartTime = Date.now();
      await dbService.mergeStagingToTarget();

      logger.info(
        `${elapsedTime(
          mergeStartTime
        )} Staging data merged into target tables for file: ${s3key}`
      );

      const cleanupStartTime = Date.now();
      await dbService.cleanStaging();

      logger.info(
        `${elapsedTime(
          cleanupStartTime
        )} Staging cleanup completed for file: ${s3key}`
      );
    } catch (error: unknown) {
      if (totalRecordsProcessed > 0) {
        await dbService.cleanStaging();
        logger.warn(
          `${elapsedTime(
            startTime
          )} Error processing file ${s3key}. Performed staging cleanup.`
        );
      }
      throw error;
    }
  },
});

export type JwtAuditService = ReturnType<typeof jwtAuditServiceBuilder>;
