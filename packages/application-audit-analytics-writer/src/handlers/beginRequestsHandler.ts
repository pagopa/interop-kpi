/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { ApplicationAuditBeginRequest } from "pagopa-interop-kpi-models";
import { Logger } from "pagopa-interop-kpi-commons";
import { config } from "../config/config.js";
import { batchMessages } from "../utilities/batchHelper.js";

export async function handleBeginRequestsMessages(
  messages: ApplicationAuditBeginRequest[],
  logger: Logger
) {
  // eslint-disable-next-line functional/no-let
  let totalMsgsProcessed = 0;

  try {
    for (const batch of batchMessages<ApplicationAuditBeginRequest>(
      messages,
      config.msgsInsertPerBatch
    )) {
      // TODO: batch insertion operation
      totalMsgsProcessed += batch.length;
    }

    if (totalMsgsProcessed === 0) {
      logger.info(
        `No Kafka messages processed for BeginRequests batch. Skipping merge and cleanup.`
      );
      return;
    }

    logger.info(
      `Staging insertion completed for ${totalMsgsProcessed} of total ${messages.length} messages for BeginRequests batch.`
    );

    // TODO: merge operation

    logger.info(
      `Staging data merged into target table for BeginRequests batch.`
    );

    // TODO: cleanup operation

    logger.info(`Staging cleanup completed for BeginRequests batch.`);
  } catch (error: unknown) {
    if (totalMsgsProcessed > 0) {
      // TODO: cleanup operation
      logger.warn(
        `Processing messages for BeginRequests batch failed. Staging cleanup executed.`
      );
    }
    throw new Error(
      `Processing messages for BeginRequests batch failed. ${error}`
    );
  }
}

export type HandleBeginRequestsMessages = ReturnType<
  typeof handleBeginRequestsMessages
>;
