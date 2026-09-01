/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable functional/no-let */
/* eslint-disable functional/immutable-data */
import {
  ColumnValue,
  CsvWriter,
  FileManager,
  Logger,
  batchItems,
} from "pagopa-interop-kpi-commons";
import * as ndjson from "ndjson";
import { ZodSchema } from "zod";
import { JwtAuditDBService } from "./dbService.js";

export type JwtAuditServiceConfig = {
  readonly batchSize: number;
  readonly dbIngestMode: "INSERT" | "COPY";
  readonly gzCompressionLevel: number;
  readonly s3Bucket: string;
  readonly s3CopyBucket: string;
  readonly s3DeleteAfterCopy: boolean;
};

export type JwtAuditCsvTarget<T> = {
  readonly tableName: string;
  readonly mapping: Record<string, (record: T) => ColumnValue>;
  readonly selectRecords?: (records: T[]) => T[];
};

export type JwtAuditCsvTargets<T> = {
  readonly generatedToken: JwtAuditCsvTarget<T>;
  readonly clientAssertion: JwtAuditCsvTarget<T>;
  readonly dpop: JwtAuditCsvTarget<T>;
};

type IngestionState = {
  totalRecordsProcessed: number;
  currentFile: string;
};

export function jwtAuditServiceBuilder<T>(
  dbService: JwtAuditDBService<T>,
  fileManager: FileManager,
  schema: ZodSchema<T>,
  config: JwtAuditServiceConfig,
  csvTargets: JwtAuditCsvTargets<T>
) {
  const writeBatch = (
    writer: CsvWriter<T>,
    target: JwtAuditCsvTarget<T>,
    records: T[]
  ): void => {
    const selectedRecords = target.selectRecords?.(records) ?? records;
    if (selectedRecords.length > 0) {
      writer.writeBatch(selectedRecords);
    }
  };

  async function ingestToStagingWithCopy(
    s3keys: string[],
    ingestionState: IngestionState,
    logger: Logger
  ): Promise<void> {
    const processFilesStartTime = Date.now();

    const batchIdentifier = crypto.randomUUID();
    const generatedTokenCsv = new CsvWriter(
      csvTargets.generatedToken.tableName,
      csvTargets.generatedToken.mapping,
      batchIdentifier,
      config.gzCompressionLevel
    );
    const clientAssertionCsv = new CsvWriter(
      csvTargets.clientAssertion.tableName,
      csvTargets.clientAssertion.mapping,
      batchIdentifier,
      config.gzCompressionLevel
    );
    const dpopCsv = new CsvWriter(
      csvTargets.dpop.tableName,
      csvTargets.dpop.mapping,
      batchIdentifier,
      config.gzCompressionLevel
    );

    try {
      for (const s3key of s3keys) {
        ingestionState.currentFile = s3key;

        const fileStream = await fileManager.get(
          config.s3Bucket,
          s3key,
          logger
        );
        const parsedFileStream = fileStream.pipe(ndjson.parse());

        logger.info(`Processing records for file: ${s3key}`);
        const batchStartTime = Date.now();

        for await (const batch of batchItems<T>(
          schema,
          parsedFileStream,
          config.batchSize,
          s3key,
          true
        )) {
          writeBatch(generatedTokenCsv, csvTargets.generatedToken, batch);
          writeBatch(clientAssertionCsv, csvTargets.clientAssertion, batch);
          writeBatch(dpopCsv, csvTargets.dpop, batch);
          ingestionState.totalRecordsProcessed += batch.length;
        }

        logger.debug(`Processed records for file: ${s3key}`, batchStartTime);
      }

      if (ingestionState.totalRecordsProcessed === 0) {
        logger.info(
          `No records processed for current batch. Skipping copy, merge and cleanup.`
        );
        return;
      }

      logger.info(
        `CSV content production completed with ${ingestionState.totalRecordsProcessed} records processed.`,
        processFilesStartTime
      );

      const uploadStartTime = Date.now();

      const uploadGeneratedTokenCsv = fileManager.storeStream(
        {
          bucket: config.s3CopyBucket,
          path: generatedTokenCsv.getPathName(),
          name: generatedTokenCsv.getFileName(),
          content: generatedTokenCsv.getStream(),
        },
        logger
      );

      const uploadClientAssertionCsv = fileManager.storeStream(
        {
          bucket: config.s3CopyBucket,
          path: clientAssertionCsv.getPathName(),
          name: clientAssertionCsv.getFileName(),
          content: clientAssertionCsv.getStream(),
        },
        logger
      );

      const uploadDPoPCsv = fileManager.storeStream(
        {
          bucket: config.s3CopyBucket,
          path: dpopCsv.getPathName(),
          name: dpopCsv.getFileName(),
          content: dpopCsv.getStream(),
        },
        logger
      );

      generatedTokenCsv.close();
      clientAssertionCsv.close();
      dpopCsv.close();

      await Promise.all([
        uploadGeneratedTokenCsv,
        uploadClientAssertionCsv,
        uploadDPoPCsv,
      ]);

      logger.info(`CSV upload to S3 completed`, uploadStartTime);

      const copyStartTime = Date.now();
      await dbService.copyRecordsToStaging({
        generatedTokenPath: generatedTokenCsv.getS3ObjectKey(),
        clientAssertionPath: clientAssertionCsv.getS3ObjectKey(),
        dpopPath: dpopCsv.getS3ObjectKey(),
      });

      logger.info(`COPY to staging completed`, copyStartTime);
    } finally {
      if (config.s3DeleteAfterCopy) {
        await fileManager.delete(
          config.s3CopyBucket,
          generatedTokenCsv.getS3ObjectKey(),
          logger
        );
        await fileManager.delete(
          config.s3CopyBucket,
          clientAssertionCsv.getS3ObjectKey(),
          logger
        );
        await fileManager.delete(
          config.s3CopyBucket,
          dpopCsv.getS3ObjectKey(),
          logger
        );
      }
    }
  }

  async function ingestToStagingWithInsert(
    s3keys: string[],
    ingestionState: IngestionState,
    logger: Logger
  ): Promise<void> {
    for (const s3key of s3keys) {
      ingestionState.currentFile = s3key;
      const fileStream = await fileManager.get(config.s3Bucket, s3key, logger);
      const parsedFileStream = fileStream.pipe(ndjson.parse());

      logger.info(`Processing records for file: ${s3key}`);

      const batchStartTime = Date.now();
      for await (const batch of batchItems<T>(
        schema,
        parsedFileStream,
        config.batchSize,
        s3key,
        true
      )) {
        await dbService.insertRecordsToStaging(batch);
        ingestionState.totalRecordsProcessed += batch.length;
      }

      logger.debug(
        `Insertion records for file: ${s3key} completed.`,
        batchStartTime
      );
    }

    if (ingestionState.totalRecordsProcessed === 0) {
      logger.info(
        `No records processed for current batch. Skipping merge and cleanup.`
      );
      return;
    }

    logger.info(
      `Staging insertion completed with ${ingestionState.totalRecordsProcessed} records processed.`
    );
  }

  return {
    async handleMessages(s3keys: string[], logger: Logger): Promise<void> {
      const ingestionState = {
        totalRecordsProcessed: 0,
        currentFile: "",
      };

      try {
        if (config.dbIngestMode === "COPY") {
          await ingestToStagingWithCopy(s3keys, ingestionState, logger);
        } else {
          await ingestToStagingWithInsert(s3keys, ingestionState, logger);
        }

        if (ingestionState.totalRecordsProcessed === 0) {
          return;
        }

        const deduplicateStartTime = Date.now();
        await dbService.deduplicateStaging();
        logger.info(`Staging data deduplicated`, deduplicateStartTime);

        const mergeStartTime = Date.now();
        await dbService.mergeStagingToTarget();
        logger.info(`Staging data merged into target tables`, mergeStartTime);

        const cleanupStartTime = Date.now();
        await dbService.cleanStaging();
        logger.info(`Staging cleanup completed.`, cleanupStartTime);
      } catch (error: unknown) {
        if (ingestionState.totalRecordsProcessed > 0) {
          await dbService.cleanStaging();
          logger.warn(`Performed staging cleanup due to a batch error.`);
        }

        logger.warn(
          `Error processing batch. Current file: ${
            ingestionState.currentFile
          } - Files: ${JSON.stringify(s3keys)}`
        );
        throw error;
      }
    },
  };
}

export type JwtAuditService<T> = ReturnType<typeof jwtAuditServiceBuilder<T>>;
