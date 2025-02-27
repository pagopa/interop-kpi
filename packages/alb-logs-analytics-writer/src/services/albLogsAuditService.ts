/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { FileManager, Logger, batches } from "pagopa-interop-kpi-commons";
import { config } from "../config/config.js";
import { DBService } from "./dbService.js";
import {
  LoadBalancerLog,
  LoadBalancerLogSchema,
} from "../model/load-balancer-log.js";

export const albLogsAuditServiceBuilder = (
  dbService: DBService,
  fileManager: FileManager
) => ({
  async handleMessage(s3key: string, logger: Logger): Promise<void> {
    const fileStream = await fileManager.get(config.s3Bucket, s3key, logger);
    logger.info(`Processing records for file: ${s3key}`);

    for await (const batch of batches<LoadBalancerLog>(
      LoadBalancerLogSchema,
      fileStream,
      500,
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

export type AlbLogsAuditService = ReturnType<typeof albLogsAuditServiceBuilder>;
