import {
  describe,
  expect,
  it,
  vi,
  afterAll,
  beforeAll,
  afterEach,
} from "vitest";
import { genericInternalError, JwtDbTable } from "pagopa-interop-kpi-models";
import { ITask } from "pagopa-interop-kpi-commons";
import { dbServiceBuilder } from "../src/services/dbService.js";
import { config } from "../src/config/config.js";
import { clientAssertionRepository } from "../src/repositories/clientAssertion.repository.js";
import { generatedTokenRepository } from "../src/repositories/generatedToken.repository.js";
import { GeneratedTokenAuditDetails } from "../src/model/domain/models.js";
import {
  getMockJwtAudits,
  getStagingTableCount,
  getTargetTableCount,
  dbContext,
  setupDbService,
  truncateTables,
} from "./utils.js";

describe("DB Service tests", () => {
  const { conn, pgp } = dbContext;
  const clientAssertionStagingTableName = `${JwtDbTable.client_assertion}${config.mergeTableSuffix}`;
  const generatedTokenStagingTableName = `${JwtDbTable.generated_token}${config.mergeTableSuffix}`;
  const clientAssertionTargetTableName = `${JwtDbTable.client_assertion}`;
  const generatedTokenTargetTableName = `${JwtDbTable.generated_token}`;
  const temporaryDbSchemaName = "pg_temp";

  beforeAll(async () => {
    await setupDbService.setupStagingTables();
  });

  afterAll(async () => {
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    await truncateTables(conn, temporaryDbSchemaName, config.mergeTableSuffix);
    await truncateTables(conn, config.dbSchemaName);
  });

  describe("insertRecordsToStaging", () => {
    it("should insert records and commit the transaction successfully", async () => {
      const records: GeneratedTokenAuditDetails[] = getMockJwtAudits(10);

      const dbService = dbServiceBuilder(
        dbContext,
        clientAssertionRepository,
        generatedTokenRepository
      );

      await dbService.insertRecordsToStaging(records);

      const clientAssertionStagingCount = await getStagingTableCount(
        conn,
        clientAssertionStagingTableName
      );

      expect(clientAssertionStagingCount).toBe(10);
    });

    it("should throw an error if database query fails", async () => {
      const mockQueryError =
        "TypeError: Cannot generate an INSERT from an empty array.";

      const dbService = dbServiceBuilder(
        dbContext,
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
        dbContext,
        clientAssertionRepository,
        mockGeneratedTokenRepository
      );

      await expect(
        dbService.insertRecordsToStaging(records)
      ).rejects.toThrowError(mockError);

      const clientAssertionStagingCountAfterRollback =
        await getStagingTableCount(conn, clientAssertionStagingTableName);

      expect(clientAssertionStagingCountAfterRollback).toBe(0);
    });
  });

  describe("mergeStagingToTarget", () => {
    it("should merge staging data into target tables successfully", async () => {
      const records: GeneratedTokenAuditDetails[] = getMockJwtAudits(10);

      const dbService = dbServiceBuilder(
        dbContext,
        clientAssertionRepository,
        generatedTokenRepository
      );

      await dbService.insertRecordsToStaging(records);
      await dbService.mergeStagingToTarget();

      const clientAssertionTargetCountAfterMerge = await getTargetTableCount(
        conn,
        clientAssertionTargetTableName
      );

      const generatedTokenTargetCountAfterMerge = await getTargetTableCount(
        conn,
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

      await conn.tx(async (t: ITask<unknown>) => {
        await clientAssertionRepository(conn).insert(t, pgp, records);

        await generatedTokenRepository(conn).insert(t, pgp, records);
      });

      const clientAssertionStagingCountAfterInsert = await getStagingTableCount(
        conn,
        clientAssertionStagingTableName
      );
      expect(clientAssertionStagingCountAfterInsert).toBe(10);

      await expect(
        conn.tx(async (t: ITask<unknown>) => {
          const generatedTokenRepoSpy = generatedTokenRepository(conn);
          vi.spyOn(generatedTokenRepoSpy, "merge").mockImplementation(() =>
            Promise.reject(mockError)
          );

          await clientAssertionRepository(conn).merge(t);
          await generatedTokenRepoSpy.merge(t);
        })
      ).rejects.toThrowError(mockError);

      const clientAssertionCountAfterRollback = await getTargetTableCount(
        conn,
        clientAssertionTargetTableName
      );
      expect(clientAssertionCountAfterRollback).toBe(0);
    });
  });

  describe("cleanStaging", () => {
    it("should truncate staging tables successfully after merge", async () => {
      const records: GeneratedTokenAuditDetails[] = getMockJwtAudits(10);

      const dbService = dbServiceBuilder(
        dbContext,
        clientAssertionRepository,
        generatedTokenRepository
      );

      await dbService.insertRecordsToStaging(records);
      await dbService.mergeStagingToTarget();
      await dbService.cleanStaging();

      const clientAssertionCountStagingAfterTruncate =
        await getStagingTableCount(conn, clientAssertionStagingTableName);
      expect(clientAssertionCountStagingAfterTruncate).toBe(0);

      const generatedTokenCountStagingAfterTruncate =
        await getStagingTableCount(conn, generatedTokenStagingTableName);
      expect(generatedTokenCountStagingAfterTruncate).toBe(0);
    });
  });
});
