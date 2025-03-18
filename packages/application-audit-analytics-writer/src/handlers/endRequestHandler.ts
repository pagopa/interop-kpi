/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { ApplicationAuditEndRequest } from "pagopa-interop-kpi-models";
import { Logger } from "pagopa-interop-kpi-commons";
import { config } from "../config/config.js";
import { batchMessages } from "../utilities/batchHelper.js";

export async function handleEndRequestMessages(
  messages: ApplicationAuditEndRequest[],
  logger: Logger
) {
  // eslint-disable-next-line functional/no-let
  let totalMsgsProcessed = 0;

  try {
    for (const batch of batchMessages<ApplicationAuditEndRequest>(
      messages,
      config.msgsInsertPerBatch
    )) {
      // TODO: batch insertion operation
      totalMsgsProcessed += batch.length;
    }

    if (totalMsgsProcessed === 0) {
      logger.info(
        `No Kafka messages processed for EndRequest batch. Skipping merge and cleanup.`
      );
      return;
    }

    logger.info(
      `Staging insertion completed for ${totalMsgsProcessed} of total ${messages.length} messages for EndRequest batch.`
    );

    // TODO: merge operation

    logger.info(`Staging data merged into target table for EndRequest batch.`);

    // TODO: cleanup operation

    logger.info(`Staging cleanup completed for EndRequest batch.`);
  } catch (error: unknown) {
    if (totalMsgsProcessed > 0) {
      // TODO: cleanup operation
      logger.warn(
        `Processing messages for EndRequest batch failed. Staging cleanup executed.`
      );
    }
    throw new Error(
      `Processing messages for EndRequest batch failed. ${error}`
    );
  }
}
