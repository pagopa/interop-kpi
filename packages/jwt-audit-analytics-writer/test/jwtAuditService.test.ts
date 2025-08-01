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
import { batchItems, genericLogger } from "pagopa-interop-kpi-commons";
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
} from "./utils.js";

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
    await truncateTables(conn, config.dbSchemaName);
  });

  describe("handleMessage", () => {
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
  });
});
