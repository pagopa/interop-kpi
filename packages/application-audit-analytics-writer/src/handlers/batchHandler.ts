/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable functional/immutable-data */
/* eslint-disable max-params */
import {
  ColumnValue,
  CsvWriter,
  FileManager,
  Logger,
} from "pagopa-interop-kpi-commons";
import { match } from "ts-pattern";
import { ApplicationDbTable } from "pagopa-interop-kpi-models";
import { config } from "../config/config.js";
import { batchMessages } from "../utilities/batchHelper.js";

interface IngestionState {
  totalRecordsProcessed: number;
  currentTable: ApplicationDbTable;
}

export async function processBatch<
  TSchema,
  TRepository extends {
    insertToStaging: (messages: TSchema[]) => Promise<void>;
    copyFromS3ToStaging: (s3ObjectKey: string) => Promise<void>;
    mergeStagingToTarget: () => Promise<void>;
    cleanStaging: () => Promise<void>;
  }
>(
  messages: TSchema[],
  repository: TRepository,
  table: ApplicationDbTable,
  mapping: Record<string, (r: TSchema) => ColumnValue>,
  fileManager: FileManager,
  logger: Logger
) {
  const ingestionState: IngestionState = {
    totalRecordsProcessed: 0,
    currentTable: table,
  };

  try {
    await match(config.dbIngestMode)
      .with("COPY", async () => {
        await ingestToStagingWithCopy(
          messages,
          ingestionState,
          mapping,
          logger
        );
      })
      .with("INSERT", async () => {
        await ingestToStagingWithInsert(messages, ingestionState, logger);
      })
      .exhaustive();

    if (ingestionState.totalRecordsProcessed === 0) {
      return;
    }

    const batchMergeStartTime = Date.now();
    await repository.mergeStagingToTarget();
    logger.info(
      `Staging data merged into target table for ${ingestionState.currentTable} batch.`,
      batchMergeStartTime
    );

    const batchCleanUpStartTime = Date.now();
    await repository.cleanStaging();
    logger.info(
      `Staging cleanup completed for ${ingestionState.currentTable} batch.`,
      batchCleanUpStartTime
    );
  } catch (error: unknown) {
    if (ingestionState.totalRecordsProcessed > 0) {
      await repository.cleanStaging();
      logger.warn(
        `Processing messages for ${ingestionState.currentTable} batch failed. Staging cleanup executed.`
      );
    }
    throw new Error(
      `Processing messages for ${ingestionState.currentTable} batch failed. ${error}`
    );
  }

  async function ingestToStagingWithCopy(
    messages: TSchema[],
    ingestionState: IngestionState,
    mapping: Record<string, (r: TSchema) => ColumnValue>,
    logger: Logger
  ): Promise<void> {
    const processFilesStartTime = Date.now();

    const batchIdentifier = crypto.randomUUID();
    const applicationAuditCsv = new CsvWriter(
      ingestionState.currentTable,
      mapping,
      batchIdentifier,
      config.gzCompressionLevel
    );

    try {
      const batchStartTime = Date.now();
      for (const batch of batchMessages(messages, config.msgsInsertPerBatch)) {
        applicationAuditCsv.writeBatch(batch);
        ingestionState.totalRecordsProcessed += batch.length;
      }

      logger.debug(
        `Processed records for ${ingestionState.currentTable}`,
        batchStartTime
      );

      if (ingestionState.totalRecordsProcessed === 0) {
        logger.info(
          `No records processed for current batch ${ingestionState.currentTable}. Skipping copy, merge and cleanup.`
        );
        return;
      }

      logger.info(
        `CSV content production completed with ${ingestionState.totalRecordsProcessed} records processed for ${ingestionState.currentTable}.`,
        processFilesStartTime
      );

      const uploadStartTime = Date.now();

      const uploadApplicationAuditCsv = fileManager.storeStream(
        {
          bucket: config.s3CopyBucket,
          path: applicationAuditCsv.getPathName(),
          name: applicationAuditCsv.getFileName(),
          content: applicationAuditCsv.getStream(),
        },
        logger
      );

      applicationAuditCsv.close();

      await Promise.all([uploadApplicationAuditCsv]);

      logger.info(
        `CSV upload to S3 completed for ${ingestionState.currentTable}`,
        uploadStartTime
      );

      const copyStartTime = Date.now();
      await repository.copyFromS3ToStaging(
        applicationAuditCsv.getS3ObjectKey()
      );

      logger.info(
        `COPY to staging completed for ${ingestionState.currentTable}`,
        copyStartTime
      );
    } finally {
      if (config.s3DeleteAfterCopy) {
        await fileManager.delete(
          config.s3CopyBucket,
          applicationAuditCsv.getS3ObjectKey(),
          logger
        );
      }
    }
  }

  async function ingestToStagingWithInsert(
    messages: TSchema[],
    ingestionState: IngestionState,
    logger: Logger
  ): Promise<void> {
    logger.info(`Processing records for ${ingestionState.currentTable}`);

    const batchStartTime = Date.now();
    for (const batch of batchMessages<TSchema>(
      messages,
      config.msgsInsertPerBatch
    )) {
      await repository.insertToStaging(batch);
      ingestionState.totalRecordsProcessed += batch.length;
    }

    logger.debug(
      `Insertion records for ${ingestionState.currentTable} completed.`,
      batchStartTime
    );

    if (ingestionState.totalRecordsProcessed === 0) {
      logger.info(
        `No records processed for current batch ${ingestionState.currentTable}. Skipping merge and cleanup.`
      );
      return;
    }

    logger.info(
      `Staging insertion completed with ${ingestionState.totalRecordsProcessed} records processed for ${ingestionState.currentTable}.`
    );
  }
}
