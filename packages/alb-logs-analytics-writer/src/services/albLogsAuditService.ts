/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { createGunzip } from "zlib";
import { FileManager, Logger, batches } from "pagopa-interop-kpi-commons";
import { config } from "../config/config.js";
import {
  LoadBalancerLog,
  LoadBalancerLogSchema,
} from "../model/load-balancer-log.js";
import { errorMapper } from "../utilities/errorMapper.js";
import { transformFileStream } from "../utilities/transformFileStream.js";
import { DBService } from "./dbService.js";

export const albLogsAuditServiceBuilder = (
  dbService: DBService,
  fileManager: FileManager
) => ({
  async handleMessage(s3key: string, logger: Logger): Promise<void> {
    if (!s3key.endsWith(".gz")) {
      throw new Error(
        `Unsupported file format: ${s3key}. Only .gz files are allowed.`
      );
    }
    try {
      const fileStream = (
        await fileManager.get(config.s3Bucket, s3key, logger)
      ).pipe(createGunzip());

      fileStream.on("error", (err) => {
        throw new Error(`Decompression error: ${err.message}`);
      });

      const parsedFileStream = transformFileStream(fileStream);

      logger.info(`Processing records for file: ${s3key}`);

      for await (const batch of batches<LoadBalancerLog>(
        LoadBalancerLogSchema,
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
    } catch (error) {
      throw errorMapper(error, logger);
    }
  },
});

export type AlbLogsAuditService = ReturnType<typeof albLogsAuditServiceBuilder>;
