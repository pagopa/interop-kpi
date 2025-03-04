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
  genericInternalError,
  JwtGeneratedDbTable,
} from "pagopa-interop-kpi-models";
import { ITask } from "pagopa-interop-kpi-commons";
import { dbServiceBuilder } from "../src/services/dbService.js";
import { config } from "../src/config/config.js";
import { clientAssertionRepository } from "../src/repositories/clientAssertion.repository.js";
import { generatedTokenRepository } from "../src/repositories/generatedToken.repository.js";
import { GeneratedTokenAuditDetails } from "../src/model/domain/models.js";
import {
  getMockJwtAudits,
  getTableCount,
  postgresDB,
  setupDbService,
  truncateTables,
} from "./utils.js";

describe("DB Service tests", () => {
  const clientAssertionStagingTableName = `${JwtGeneratedDbTable.client_assertion}${config.mergeTableSuffix}`;
  const generatedTokenStagingTableName = `${JwtGeneratedDbTable.generated_token}${config.mergeTableSuffix}`;
  const clientAssertionTargetTableName = `${JwtGeneratedDbTable.client_assertion}`;
  const generatedTokenTargetTableName = `${JwtGeneratedDbTable.generated_token}`;

  beforeAll(async () => {
    await setupDbService.setupStagingTables();
  });

  afterAll(async () => {
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    await truncateTables(
      postgresDB,
      config.dbSchemaName,
      config.mergeTableSuffix
    );
    await truncateTables(postgresDB, config.dbSchemaName);
  });

  describe("insertRecordsToStaging", () => {
    it("should insert records and commit the transaction successfully", async () => {
      const records: GeneratedTokenAuditDetails[] = getMockJwtAudits(10);

      const dbService = dbServiceBuilder(
        postgresDB,
        clientAssertionRepository,
        generatedTokenRepository
      );

      await dbService.insertRecordsToStaging(records);

      const clientAssertionStagingCount = await getTableCount(
        postgresDB,
        config.dbSchemaName,
        clientAssertionStagingTableName
      );

      expect(clientAssertionStagingCount).toBe(10);
    });

    it("should throw an error if database query fails", async () => {
      const mockQueryError =
        "TypeError: Cannot generate an INSERT from an empty array.";

      const dbService = dbServiceBuilder(
        postgresDB,
        clientAssertionRepository,
        generatedTokenRepository
      );

      await expect(dbService.insertRecordsToStaging([])).rejects.toThrowError(
        genericInternalError(
          `Error inserting into client_assertion staging table: ${mockQueryError}`
        )
      );
    });

    it("should throw an error and rollback client_assertion records when generated_token inserts fails", async () => {
      const mockQueryError =
        "TypeError: Cannot generate an INSERT from an empty array.";
      const mockError = genericInternalError(
        `Error inserting into generated_token staging table: ${mockQueryError}`
      );

      const mockGeneratedTokenRepository = vi.fn().mockImplementation(() => ({
        insert: vi.fn(() => Promise.reject(mockError)),
        merge: vi.fn(() => Promise.resolve()),
        clean: vi.fn(() => Promise.resolve()),
      }));

      const records: GeneratedTokenAuditDetails[] = getMockJwtAudits(10);

      const dbService = dbServiceBuilder(
        postgresDB,
        clientAssertionRepository,
        mockGeneratedTokenRepository
      );

      await expect(
        dbService.insertRecordsToStaging(records)
      ).rejects.toThrowError(mockError);

      const clientAssertionStagingCountAfterRollback = await getTableCount(
        postgresDB,
        config.dbSchemaName,
        clientAssertionStagingTableName
      );

      expect(clientAssertionStagingCountAfterRollback).toBe(0);
    });
  });

  describe("mergeStagingToTarget", () => {
    it("should merge staging data into target tables successfully", async () => {
      const records: GeneratedTokenAuditDetails[] = getMockJwtAudits(10);

      const dbService = dbServiceBuilder(
        postgresDB,
        clientAssertionRepository,
        generatedTokenRepository
      );

      await dbService.insertRecordsToStaging(records);
      await dbService.mergeStagingToTarget();

      const clientAssertionTargetCountAfterMerge = await getTableCount(
        postgresDB,
        config.dbSchemaName,
        clientAssertionTargetTableName
      );

      const generatedTokenTargetCountAfterMerge = await getTableCount(
        postgresDB,
        config.dbSchemaName,
        generatedTokenTargetTableName
      );

      expect(clientAssertionTargetCountAfterMerge).toBe(10);
      expect(generatedTokenTargetCountAfterMerge).toBe(10);
    });

    it("should throw an error and rollback merged client_assertion records when generated_token merge fails", async () => {
      const records: GeneratedTokenAuditDetails[] = getMockJwtAudits(10);
      const mockQueryError = "Generic merge error";
      const mockError = genericInternalError(
        `Error merging staging to target generated_client table: ${mockQueryError}`
      );

      await postgresDB.tx(async (t: ITask<unknown>) => {
        await clientAssertionRepository(t).insert(
          postgresDB.$config.pgp,
          records
        );

        await generatedTokenRepository(t).insert(
          postgresDB.$config.pgp,
          records
        );
      });

      const clientAssertionStagingCountAfterInsert = await getTableCount(
        postgresDB,
        config.dbSchemaName,
        clientAssertionStagingTableName
      );
      expect(clientAssertionStagingCountAfterInsert).toBe(10);

      await expect(
        postgresDB.tx(async (t: ITask<unknown>) => {
          const generatedTokenRepoSpy = generatedTokenRepository(t);
          vi.spyOn(generatedTokenRepoSpy, "merge").mockImplementation(() =>
            Promise.reject(mockError)
          );

          await clientAssertionRepository(t).merge();
          await generatedTokenRepoSpy.merge();
        })
      ).rejects.toThrowError(mockError);

      const clientAssertionCountAfterRollback = await getTableCount(
        postgresDB,
        config.dbSchemaName,
        clientAssertionTargetTableName
      );
      expect(clientAssertionCountAfterRollback).toBe(0);
    });
  });

  describe("cleanStaging", () => {
    it("should truncate staging tables successfully after merge", async () => {
      const records: GeneratedTokenAuditDetails[] = getMockJwtAudits(10);

      const dbService = dbServiceBuilder(
        postgresDB,
        clientAssertionRepository,
        generatedTokenRepository
      );

      await dbService.insertRecordsToStaging(records);
      await dbService.mergeStagingToTarget();
      await dbService.cleanStaging();

      const clientAssertionCountStagingAfterTruncate = await getTableCount(
        postgresDB,
        config.dbSchemaName,
        clientAssertionStagingTableName
      );
      expect(clientAssertionCountStagingAfterTruncate).toBe(0);

      const generatedTokenCountStagingAfterTruncate = await getTableCount(
        postgresDB,
        config.dbSchemaName,
        generatedTokenStagingTableName
      );
      expect(generatedTokenCountStagingAfterTruncate).toBe(0);
    });
  });
});
