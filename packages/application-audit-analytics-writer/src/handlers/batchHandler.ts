/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { Logger } from "pagopa-interop-kpi-commons";
import { config } from "../config/config.js";
import { batchMessages } from "../utilities/batchHelper.js";

export async function processBatch<
  TSchema,
  TRepository extends {
    batchInsert: (messages: TSchema[]) => Promise<void>;
    mergeStagingToTarget: () => Promise<void>;
    cleanStaging: () => Promise<void>;
  }
>(
  messages: TSchema[],
  repository: TRepository,
  description: string,
  logger: Logger
) {
  // eslint-disable-next-line functional/no-let
  let totalMsgsProcessed = 0;

  try {
    for (const batch of batchMessages<TSchema>(
      messages,
      config.msgsInsertPerBatch
    )) {
      await repository.batchInsert(batch);
      totalMsgsProcessed += batch.length;
    }

    if (totalMsgsProcessed === 0) {
      logger.info(
        `No Kafka messages processed for ${description} batch. Skipping merge and cleanup.`
      );
      return;
    }

    logger.info(
      `Staging insertion completed for ${totalMsgsProcessed} of total ${messages.length} messages for ${description} batch.`
    );

    await repository.mergeStagingToTarget();
    logger.info(
      `Staging data merged into target table for ${description} batch.`
    );

    await repository.cleanStaging();
    logger.info(`Staging cleanup completed for ${description} batch.`);
  } catch (error: unknown) {
    if (totalMsgsProcessed > 0) {
      await repository.cleanStaging();
      logger.warn(
        `Processing messages for ${description} batch failed. Staging cleanup executed.`
      );
    }
    throw new Error(
      `Processing messages for ${description} batch failed. ${error}`
    );
  }
}
