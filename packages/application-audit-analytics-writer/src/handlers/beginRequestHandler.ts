/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { ApplicationAuditBeginRequest } from "pagopa-interop-kpi-models";
import { Logger } from "pagopa-interop-kpi-commons";
import { config } from "../config/config.js";
import { batchMessages } from "../utilities/batchHelper.js";
import { BeginRequestRepository } from "../repositories/beginRequest.repository.js";

export async function handleBeginRequestMessages(
  messages: ApplicationAuditBeginRequest[],
  beginRequestRepository: BeginRequestRepository,
  logger: Logger
) {
  // eslint-disable-next-line functional/no-let
  let totalMsgsProcessed = 0;

  try {
    for (const batch of batchMessages<ApplicationAuditBeginRequest>(
      messages,
      config.msgsInsertPerBatch
    )) {
      await beginRequestRepository.batchInsert(batch);
      totalMsgsProcessed += batch.length;
    }

    if (totalMsgsProcessed === 0) {
      logger.info(
        `No Kafka messages processed for BeginRequest batch. Skipping merge and cleanup.`
      );
      return;
    }

    logger.info(
      `Staging insertion completed for ${totalMsgsProcessed} of total ${messages.length} messages for BeginRequest batch.`
    );

    await beginRequestRepository.mergeStagingToTarget();

    logger.info(
      `Staging data merged into target table for BeginRequest batch.`
    );

    await beginRequestRepository.cleanStaging();

    logger.info(`Staging cleanup completed for BeginRequest batch.`);
  } catch (error: unknown) {
    if (totalMsgsProcessed > 0) {
      await beginRequestRepository.cleanStaging();
      logger.warn(
        `Processing messages for BeginRequest batch failed. Staging cleanup executed.`
      );
    }
    throw new Error(
      `Processing messages for BeginRequest batch failed. ${error}`
    );
  }
}
