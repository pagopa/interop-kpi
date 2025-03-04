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
import { genericLogger } from "pagopa-interop-kpi-commons";
import { JwtGeneratedDbTable } from "pagopa-interop-kpi-models";
import {
  GeneratedTokenAuditDetails,
  tokenAuditSchema,
} from "../src/model/domain/models.js";
import { config } from "../src/config/config.js";
import { batches } from "../src/utilities/batchHelper.js";
import {
  dbService,
  fileManager,
  getMockJwtAudits,
  getTableCount,
  jwtAuditService,
  postgresDB,
  setupDbService,
  truncateTables,
  writeJwtAuditNdjson,
} from "./utils.js";

describe("JWT Audit Service tests", () => {
  beforeAll(async () => {
    await setupDbService.setupStagingTables();
  });

  afterAll(async () => {
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    await truncateTables(postgresDB, config.dbSchemaName);
  });

  describe("handleMessage", () => {
    it("should read the ndjson file from s3 and persist its data to the database successfully", async () => {
      const clientAssertionStagingTableName = `${JwtGeneratedDbTable.client_assertion}${config.mergeTableSuffix}`;
      const generateTokenStagingTableName = `${JwtGeneratedDbTable.generated_token}${config.mergeTableSuffix}`;

      const records: GeneratedTokenAuditDetails[] = getMockJwtAudits(10);
      const { fullPathName } = await writeJwtAuditNdjson(
        records,
        fileManager,
        genericLogger
      );

      await jwtAuditService.handleMessage(fullPathName, genericLogger);

      const clientAssertionStagingCount = await getTableCount(
        postgresDB,
        config.dbSchemaName,
        clientAssertionStagingTableName
      );
      expect(clientAssertionStagingCount).toBe(0);

      const generatedTokenStagingCount = await getTableCount(
        postgresDB,
        config.dbSchemaName,
        generateTokenStagingTableName
      );
      expect(generatedTokenStagingCount).toBe(0);

      const clientAssertionCount = await getTableCount(
        postgresDB,
        config.dbSchemaName,
        JwtGeneratedDbTable.client_assertion
      );
      expect(clientAssertionCount).toBe(10);

      const generatedTokenCount = await getTableCount(
        postgresDB,
        config.dbSchemaName,
        JwtGeneratedDbTable.generated_token
      );
      expect(generatedTokenCount).toBe(10);
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

      await jwtAuditService.handleMessage(fullPathName, genericLogger);

      expect(dbService.insertRecordsToStaging).not.toHaveBeenCalled();
      expect(dbService.mergeStagingToTarget).not.toHaveBeenCalled();
      expect(dbService.cleanStaging).not.toHaveBeenCalled();
    });

    it("should call the logger for each invalid record, return the correct number of batches executed, and process the correct total number of valid records", async () => {
      const validRecords = getMockJwtAudits(5);
      const invalidRecords = Array.from({ length: 3 }, () => ({}));
      const allRecords: unknown[] = [...validRecords, ...invalidRecords];
      const source: AsyncIterable<unknown> = Readable.from(allRecords);

      const parsingRecordErrorSpy = vi.spyOn(genericLogger, "warn");

      // eslint-disable-next-line functional/no-let
      let totalRecordsProcessed = 0;

      const batchesIteration: unknown[][] = [];

      for await (const batch of batches(
        tokenAuditSchema,
        source,
        2,
        "s3key",
        genericLogger
      )) {
        // eslint-disable-next-line functional/immutable-data
        batchesIteration.push(batch);
        totalRecordsProcessed += batch.length;
      }

      expect(totalRecordsProcessed).toBe(5);
      expect(batchesIteration.length).toBe(3);
      expect(parsingRecordErrorSpy).toHaveBeenCalledTimes(3);
    });
  });
});
