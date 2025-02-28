/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { text } from "stream/consumers";
import { FileManager, Logger, batches } from "pagopa-interop-kpi-commons";
import { config } from "../config/config.js";
import {
  LoadBalancerLog,
  LoadBalancerLogSchema,
} from "../model/load-balancer-log.js";
import { DBService } from "./dbService.js";

export const albLogsAuditServiceBuilder = (
  dbService: DBService,
  fileManager: FileManager
) => ({
  async handleMessage(s3key: string, logger: Logger): Promise<void> {
    const fileStream = await fileManager.get(config.s3Bucket, s3key, logger);
    const jsonData = await getFileFromFileStream(fileStream);
    const parsedData: AsyncIterable<LoadBalancerLog> = JSON.parse(jsonData);

    logger.info(`Processing records for file: ${s3key}`);

    for await (const batch of batches<LoadBalancerLog>(
      LoadBalancerLogSchema,
      parsedData,
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

async function getFileFromFileStream(
  fileStream: NodeJS.ReadableStream
): Promise<string> {
  return text(fileStream);
}

export type AlbLogsAuditService = ReturnType<typeof albLogsAuditServiceBuilder>;
