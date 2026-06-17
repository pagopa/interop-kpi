/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable functional/no-let */
/* eslint-disable functional/immutable-data */
import {
  CsvWriter,
  FileManager,
  Logger,
  batchItems,
} from "pagopa-interop-kpi-commons";
import * as ndjson from "ndjson";
import { JwtDbTable } from "pagopa-interop-kpi-models";
import { match } from "ts-pattern";
import { config } from "../config/config.js";
import {
  GeneratedTokenAuditDetails,
  tokenAuditSchema,
} from "../model/domain/models.js";
import { generatedTokenMapping } from "../repositories/generatedToken.repository.js";
import { clientAssertionMapping } from "../repositories/clientAssertion.repository.js";
import { dpopMapping } from "../repositories/dpop.repository.js";
import { DBService } from "./dbService.js";

export const jwtAuditServiceBuilder = (
  dbService: DBService,
  fileManager: FileManager
) => {
  interface IngestionState {
    totalRecordsProcessed: number;
    currentFile: string;
  }

  async function ingestToStagingWithCopy(
    s3keys: string[],
    ingestionState: IngestionState,
    logger: Logger
  ): Promise<void> {
    const processFilesStartTime = Date.now();

    const batchIdentifier = crypto.randomUUID();
    const generatedTokenCsv = new CsvWriter(
      JwtDbTable.generated_token,
      generatedTokenMapping,
      batchIdentifier,
      config.gzCompressionLevel
    );
    const clientAssertionCsv = new CsvWriter(
      JwtDbTable.client_assertion,
      clientAssertionMapping,
      batchIdentifier,
      config.gzCompressionLevel
    );
    const dpopCsv = new CsvWriter(
      JwtDbTable.dpop,
      dpopMapping,
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

        for await (const batch of batchItems<GeneratedTokenAuditDetails>(
          tokenAuditSchema,
          parsedFileStream,
          config.batchSize,
          s3key,
          true
        )) {
          generatedTokenCsv.writeBatch(batch);
          clientAssertionCsv.writeBatch(batch);
          const batchWithDpop = batch.filter((msg) => msg.dpop);
          if (batchWithDpop.length > 0) {
            dpopCsv.writeBatch(batchWithDpop);
          }
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
      for await (const batch of batchItems<GeneratedTokenAuditDetails>(
        tokenAuditSchema,
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
        await match(config.dbIngestMode)
          .with("COPY", async () => {
            await ingestToStagingWithCopy(s3keys, ingestionState, logger);
          })
          .with("INSERT", async () => {
            await ingestToStagingWithInsert(s3keys, ingestionState, logger);
          })
          .exhaustive();

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
};

export type JwtAuditService = ReturnType<typeof jwtAuditServiceBuilder>;
