/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable functional/no-let */
import { FileManager, Logger, batchItems } from "pagopa-interop-kpi-commons";
import * as ndjson from "ndjson";
import { config } from "../config/config.js";
import {
  GeneratedTokenAuditDetails,
  tokenAuditSchema,
} from "../model/domain/models.js";
import { DBService } from "./dbService.js";

export const jwtAuditServiceBuilder = (
  dbService: DBService,
  fileManager: FileManager
) => ({
  async handleMessages(s3keys: string[], logger: Logger): Promise<void> {
    let totalRecordsProcessed: number = 0;
    let currentFile: string = "";

    try {
      for (const s3key of s3keys) {
        currentFile = s3key;
        const fileStream = await fileManager.get(
          config.s3Bucket,
          s3key,
          logger
        );
        const parsedFileStream = fileStream.pipe(ndjson.parse());

        logger.info(`Processing records for file: ${s3key}`);

        const batchStartTime = Date.now();
        for await (const batch of batchItems<GeneratedTokenAuditDetails>(
          tokenAuditSchema,
          parsedFileStream,
          config.batchSize,
          s3key,
          logger
        )) {
          await dbService.insertRecordsToStaging(batch);
          totalRecordsProcessed += batch.length;
        }

        logger.debug(
          `Insertion records for file: ${s3key} completed.`,
          batchStartTime
        );
      }

      if (totalRecordsProcessed === 0) {
        logger.info(
          `No records processed for current batch. Skipping merge and cleanup.`
        );
        return;
      }

      logger.info(
        `Staging insertion completed with ${totalRecordsProcessed} records processed.`
      );

      const mergeStartTime = Date.now();
      await dbService.mergeStagingToTarget();

      logger.info(`Staging data merged into target tables`, mergeStartTime);

      const cleanupStartTime = Date.now();
      await dbService.cleanStaging();

      logger.info(`Staging cleanup completed.`, cleanupStartTime);
    } catch (error: unknown) {
      if (totalRecordsProcessed > 0) {
        await dbService.cleanStaging();
        logger.warn(`Performed staging cleanup due to a batch error.`);
      }
      logger.warn(
        `Error processing batch. Current file: ${currentFile} - Files: ${JSON.stringify(
          s3keys
        )}`
      );
      throw error;
    }
  },
});

export type JwtAuditService = ReturnType<typeof jwtAuditServiceBuilder>;
