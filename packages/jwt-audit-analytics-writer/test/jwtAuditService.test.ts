/* eslint-disable @typescript-eslint/no-loss-of-precision */
/* eslint-disable functional/immutable-data */
import { Readable } from "stream";
import {
  describe,
  expect,
  it,
  vi,
  afterAll,
  beforeAll,
  afterEach,
} from "vitest";
import {
  batchItems,
  genericLogger,
  MAX_SUPPORTED_TIMESTAMP_MS,
} from "pagopa-interop-kpi-commons";
import { JwtDbTable } from "pagopa-interop-kpi-models";
import {
  GeneratedTokenAuditDetails,
  tokenAuditSchema,
} from "../src/model/domain/models.js";
import { config } from "../src/config/config.js";
import {
  dbService,
  fileManager,
  getMockJwtAudits,
  getStagingTableCount,
  getTargetTableCount,
  jwtAuditService,
  dbContext,
  setupDbService,
  truncateTables,
  writeJwtAuditNdjson,
  getMockJwtAuditWithDuplicates,
  getMockJwtAudit,
  cleanBucket,
} from "./utils.js";

const DEFAULT_CONFIG = { ...config };

describe("JWT Audit Service tests", () => {
  const { conn } = dbContext;

  beforeAll(async () => {
    await setupDbService.setupStagingTables([
      JwtDbTable.generated_token,
      JwtDbTable.client_assertion,
    ]);
  });

  afterAll(async () => {
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    Object.assign(config, DEFAULT_CONFIG);
    await truncateTables(conn, config.dbSchemaName);
  });

  describe("handleMessage", () => {
    it("should process multiple ndjson files from s3 and persist all data to the database successfully", async () => {
      const clientAssertionStagingTableName = `${JwtDbTable.client_assertion}${config.mergeTableSuffix}`;
      const generateTokenStagingTableName = `${JwtDbTable.generated_token}${config.mergeTableSuffix}`;

      const mockConfig = {
        ...config,
        receiveMsgsCalls: 10,
        maxNumberOfMessages: 10,
      };

      const S3_KEYS_NUMBER =
        mockConfig.receiveMsgsCalls * mockConfig.maxNumberOfMessages;

      const RECORDS_PER_FILE = 10;

      const allS3Keys = await Promise.all(
        Array.from({ length: S3_KEYS_NUMBER }).map(async () => {
          const records: GeneratedTokenAuditDetails[] =
            getMockJwtAudits(RECORDS_PER_FILE);

          const { fullPathName } = await writeJwtAuditNdjson(
            records,
            fileManager,
            genericLogger
          );

          return fullPathName;
        })
      );

      await jwtAuditService.handleMessages(allS3Keys, genericLogger);

      const clientAssertionStagingCount = await getStagingTableCount(
        conn,
        clientAssertionStagingTableName
      );
      expect(clientAssertionStagingCount).toBe(0);

      const generatedTokenStagingCount = await getStagingTableCount(
        conn,
        generateTokenStagingTableName
      );
      expect(generatedTokenStagingCount).toBe(0);

      const expectedTotal = S3_KEYS_NUMBER * RECORDS_PER_FILE;

      const clientAssertionCount = await getTargetTableCount(
        conn,
        JwtDbTable.client_assertion
      );
      expect(clientAssertionCount).toBe(expectedTotal);

      const generatedTokenCount = await getTargetTableCount(
        conn,
        JwtDbTable.generated_token
      );
      expect(generatedTokenCount).toBe(expectedTotal);
    });

    it("should read the ndjson file from s3 and persist its data to the database successfully", async () => {
      const clientAssertionStagingTableName = `${JwtDbTable.client_assertion}${config.mergeTableSuffix}`;
      const generateTokenStagingTableName = `${JwtDbTable.generated_token}${config.mergeTableSuffix}`;

      const records: GeneratedTokenAuditDetails[] = getMockJwtAudits(10);
      const { fullPathName } = await writeJwtAuditNdjson(
        records,
        fileManager,
        genericLogger
      );

      await jwtAuditService.handleMessages([fullPathName], genericLogger);

      const clientAssertionStagingCount = await getStagingTableCount(
        conn,
        clientAssertionStagingTableName
      );
      expect(clientAssertionStagingCount).toBe(0);

      const generatedTokenStagingCount = await getStagingTableCount(
        conn,
        generateTokenStagingTableName
      );
      expect(generatedTokenStagingCount).toBe(0);

      const clientAssertionCount = await getTargetTableCount(
        conn,
        JwtDbTable.client_assertion
      );
      expect(clientAssertionCount).toBe(10);

      const generatedTokenCount = await getTargetTableCount(
        conn,
        JwtDbTable.generated_token
      );
      expect(generatedTokenCount).toBe(10);
    });

    it("should read the ndjson file from s3 and persist its data with deduplication to the database successfully", async () => {
      const records: GeneratedTokenAuditDetails[] =
        getMockJwtAuditWithDuplicates(900, 100);

      const { fullPathName } = await writeJwtAuditNdjson(
        records,
        fileManager,
        genericLogger
      );

      await jwtAuditService.handleMessages([fullPathName], genericLogger);

      const generatedTokenCount = await getTargetTableCount(
        conn,
        JwtDbTable.generated_token
      );
      expect(generatedTokenCount).toBe(900);
    });

    it("should not call any dbService operations when there are no records", async () => {
      const { fullPathName } = await writeJwtAuditNdjson(
        [],
        fileManager,
        genericLogger
      );

      vi.spyOn(dbService, "insertRecordsToStaging");
      vi.spyOn(dbService, "mergeStagingToTarget");
      vi.spyOn(dbService, "cleanStaging");

      await jwtAuditService.handleMessages([fullPathName], genericLogger);

      expect(dbService.insertRecordsToStaging).not.toHaveBeenCalled();
      expect(dbService.mergeStagingToTarget).not.toHaveBeenCalled();
      expect(dbService.cleanStaging).not.toHaveBeenCalled();
    });

    it("should throw an error when invalid records are encountered", async () => {
      const validRecords = getMockJwtAudits(5);
      const invalidRecords = Array.from({ length: 3 }, () => ({}));
      const allRecords: unknown[] = [...validRecords, ...invalidRecords];
      const source: AsyncIterable<unknown> = Readable.from(allRecords);

      // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
      const process = async () => {
        // eslint-disable-next-line functional/no-let
        let totalRecordsProcessed = 0;

        for await (const batch of batchItems(
          tokenAuditSchema,
          source,
          2,
          "s3key"
        )) {
          totalRecordsProcessed += batch.length;
        }

        expect(totalRecordsProcessed).toBe(0);
      };

      await expect(process()).rejects.toThrow("Invalid record for file");
    });

    it.each([
      {
        label: "decimal microseconds",
        timestamp: 1007199254740991.12345671323299222,
      },
      { label: "decimal seconds", timestamp: 1760004701.1230933 },
      { label: "integer seconds", timestamp: 1760004701 },
      { label: "milliseconds", timestamp: 1760004701987 },
      {
        label: "timestamp beyond year 9999",
        timestamp: 253402300800000000000,
      },
    ])(
      "should correctly normalize and persist issued_at and expiration_time fields for %s",
      async ({ timestamp }) => {
        const jwtAudit = getMockJwtAudit();

        const records: GeneratedTokenAuditDetails[] = [
          {
            ...jwtAudit,
            clientAssertion: {
              ...jwtAudit.clientAssertion,
              issuedAt: timestamp,
              expirationTime: timestamp,
            },
          },
        ];

        const { fullPathName } = await writeJwtAuditNdjson(
          records,
          fileManager,
          genericLogger
        );

        await jwtAuditService.handleMessages([fullPathName], genericLogger);

        const clientAssertion = await conn.one<{
          issued_at: string;
          issued_at_tz: Date;
          issued_at_raw: number;
          expiration_time: string;
          expiration_time_tz: Date;
          expiration_time_raw: number;
        }>(
          `SELECT issued_at, issued_at_tz, issued_at_raw,
              expiration_time, expiration_time_tz, expiration_time_raw
            FROM ${config.dbSchemaName}.${JwtDbTable.client_assertion}
            LIMIT 1;
          `
        );

        const fields = [
          {
            bigintValue: clientAssertion.issued_at,
            timestampTzValue: clientAssertion.issued_at_tz,
            doublePrecisionValue: clientAssertion.issued_at_raw,
          },
          {
            bigintValue: clientAssertion.expiration_time,
            timestampTzValue: clientAssertion.expiration_time_tz,
            doublePrecisionValue: clientAssertion.expiration_time_raw,
          },
        ];

        for (const {
          bigintValue,
          timestampTzValue,
          doublePrecisionValue,
        } of fields) {
          // BIGINT -> returned as string by the pg driver
          expect(typeof bigintValue).toBe("string");

          // Ensure the persisted value is a valid millisecond timestamp within supported range
          const bigintNum = Number(bigintValue);
          expect(bigintNum).toBeGreaterThan(0);
          expect(bigintNum).toBeLessThanOrEqual(MAX_SUPPORTED_TIMESTAMP_MS);

          // TIMESTAMPTZ -> should be a valid UTC Date
          expect(timestampTzValue instanceof Date).toBe(true);
          expect(!isNaN(timestampTzValue.getTime())).toBe(true);

          // DOUBLE PRECISION -> should preserve decimal precision
          expect(typeof doublePrecisionValue).toBe("number");
          expect(doublePrecisionValue).toBeCloseTo(timestamp, 6);

          // Ensure ISO serialization does not use extended years (+YYYYY)
          expect(timestampTzValue.getUTCFullYear()).toBeLessThanOrEqual(9999);
        }
      }
    );

    it("should upload CSVs, call copyRecordsToStaging, delete COPY files and cleanup staging", async () => {
      config.dbIngestMode = "COPY";
      config.s3DeleteAfterCopy = true;
      config.s3CopyBucket = "test-bucket-1";

      const records: GeneratedTokenAuditDetails[] = getMockJwtAudits(5);

      const { fullPathName } = await writeJwtAuditNdjson(
        records,
        fileManager,
        genericLogger
      );

      const copySpy = vi
        .spyOn(dbService, "copyRecordsToStaging")
        .mockResolvedValue(undefined);

      const deduplicateSpy = vi.spyOn(dbService, "deduplicateStaging");
      const mergeSpy = vi.spyOn(dbService, "mergeStagingToTarget");
      const cleanSpy = vi.spyOn(dbService, "cleanStaging");

      await jwtAuditService.handleMessages([fullPathName], genericLogger);

      const filesAfter = await fileManager.listFiles(
        config.s3CopyBucket,
        genericLogger
      );

      expect(filesAfter).toHaveLength(0);

      expect(copySpy).toHaveBeenCalledOnce();
      expect(copySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          generatedTokenPath: expect.stringContaining("generated_token"),
          clientAssertionPath: expect.stringContaining("client_assertion"),
        })
      );

      expect(deduplicateSpy).toHaveBeenCalledOnce();
      expect(mergeSpy).toHaveBeenCalledOnce();
      expect(cleanSpy).toHaveBeenCalledOnce();
    });

    it("should upload CSVs, call copyRecordsToStaging, preserve COPY files and cleanup staging", async () => {
      config.dbIngestMode = "COPY";
      config.s3DeleteAfterCopy = false;
      config.s3CopyBucket = "test-bucket-1";

      const records: GeneratedTokenAuditDetails[] = getMockJwtAudits(5);

      const { fullPathName } = await writeJwtAuditNdjson(
        records,
        fileManager,
        genericLogger
      );

      const copySpy = vi
        .spyOn(dbService, "copyRecordsToStaging")
        .mockResolvedValue(undefined);

      const deduplicateSpy = vi.spyOn(dbService, "deduplicateStaging");
      const mergeSpy = vi.spyOn(dbService, "mergeStagingToTarget");
      const cleanSpy = vi.spyOn(dbService, "cleanStaging");

      await jwtAuditService.handleMessages([fullPathName], genericLogger);

      const filesAfter = await fileManager.listFiles(
        config.s3CopyBucket,
        genericLogger
      );

      expect(filesAfter).toHaveLength(2);

      expect(copySpy).toHaveBeenCalledOnce();
      expect(copySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          generatedTokenPath: expect.stringContaining("generated_token"),
          clientAssertionPath: expect.stringContaining("client_assertion"),
        })
      );

      expect(deduplicateSpy).toHaveBeenCalledOnce();
      expect(mergeSpy).toHaveBeenCalledOnce();
      expect(cleanSpy).toHaveBeenCalledOnce();

      await cleanBucket(config.s3CopyBucket);
    });

    it("should delete COPY files if copyRecordsToStaging fails", async () => {
      config.dbIngestMode = "COPY";
      config.s3DeleteAfterCopy = true;
      config.s3CopyBucket = "test-bucket-1";

      const records: GeneratedTokenAuditDetails[] = getMockJwtAudits(5);

      const { fullPathName } = await writeJwtAuditNdjson(
        records,
        fileManager,
        genericLogger
      );

      const copyError = new Error("COPY failed");

      vi.spyOn(dbService, "copyRecordsToStaging").mockRejectedValue(copyError);
      const deduplicateSpy = vi.spyOn(dbService, "deduplicateStaging");
      const mergeSpy = vi.spyOn(dbService, "mergeStagingToTarget");

      await expect(
        jwtAuditService.handleMessages([fullPathName], genericLogger)
      ).rejects.toThrow("COPY failed");

      const filesAfter = await fileManager.listFiles(
        config.s3CopyBucket,
        genericLogger
      );
      expect(filesAfter).toHaveLength(0);

      expect(deduplicateSpy).not.toHaveBeenCalled();
      expect(mergeSpy).not.toHaveBeenCalled();
    });
  });
});
