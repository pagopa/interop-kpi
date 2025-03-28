import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApplicationAuditBeginRequest,
  ApplicationDbTable,
  genericInternalError,
} from "pagopa-interop-kpi-models";
import { genericLogger } from "pagopa-interop-kpi-commons";
import { config } from "../src/config/config.js";
import {
  BeginRequestRepository,
  beginRequestRepository,
} from "../src/repositories/beginRequest.repository.js";
import { processBatch } from "../src/handlers/batchHandler.js";
import {
  dbContext,
  getMockApplicationAudits,
  getStagingTableCount,
  getTargetTableCount,
  truncateTables,
} from "./utils.js";

describe("Begin request batch handler tests", () => {
  const { conn, pgp } = dbContext;
  const beginRequestTable = ApplicationDbTable.begin_request;
  const beginRequestStagingTable = `${beginRequestTable}${config.mergeTableSuffix}`;
  const temporaryDbSchemaName = "pg_temp";

  const beginRequestRepo = beginRequestRepository(conn, pgp);

  afterEach(async () => {
    vi.restoreAllMocks();
    const stagingTables = [beginRequestStagingTable];
    await truncateTables(conn, temporaryDbSchemaName, stagingTables);

    const targetTables = [beginRequestTable];
    await truncateTables(conn, config.dbSchemaName, targetTables);
  });

  describe("processBatch", () => {
    it("should trigger staging table cleanup if an error occurs and at least one message is processed", async () => {
      const mockQueryError = new Error("Generic merge error");
      const mockError = genericInternalError(
        `Error merging staging to target ${beginRequestStagingTable} table: ${mockQueryError}`
      );

      const beginRequestMsgs =
        getMockApplicationAudits<ApplicationAuditBeginRequest>(10, 0, 0, 0);

      vi.spyOn(genericLogger, "warn");
      vi.spyOn(beginRequestRepo, "cleanStaging");
      vi.spyOn(beginRequestRepo, "mergeStagingToTarget").mockRejectedValue(
        mockError
      );

      await expect(
        processBatch<ApplicationAuditBeginRequest, BeginRequestRepository>(
          beginRequestMsgs,
          beginRequestRepo,
          "BeginRequest",
          genericLogger
        )
      ).rejects.toThrowError();

      const beginRequestStagingCount = await getStagingTableCount(
        conn,
        beginRequestStagingTable
      );

      expect(genericLogger.warn).toHaveBeenCalled();
      expect(beginRequestRepo.cleanStaging).toHaveBeenCalled();
      expect(beginRequestStagingCount).toBe(0);
    });
  });

  describe("batchInsert", () => {
    it("should insert application audit events successfully", async () => {
      const beginRequestMsgs =
        getMockApplicationAudits<ApplicationAuditBeginRequest>(10, 0, 0, 0);

      await beginRequestRepo.batchInsert(beginRequestMsgs);

      const beginRequestStagingCount = await getStagingTableCount(
        conn,
        beginRequestStagingTable
      );

      expect(beginRequestStagingCount).toBe(10);
    });

    it("should throw an error if database query fails", async () => {
      const mockQueryError =
        "TypeError: Cannot generate an INSERT from an empty array.";
      const mockError = genericInternalError(
        `Error inserting into ${beginRequestStagingTable} staging table: ${mockQueryError}`
      );

      await expect(beginRequestRepo.batchInsert([])).rejects.toThrowError(
        mockError
      );
    });
  });

  describe("mergeStagingToTarget", () => {
    it("should merge staging data into target tables successfully", async () => {
      const beginRequestMsgs =
        getMockApplicationAudits<ApplicationAuditBeginRequest>(10, 0, 0, 0);

      await beginRequestRepo.batchInsert(beginRequestMsgs);
      await beginRequestRepo.mergeStagingToTarget();

      const beginRequestTargetCount = await getTargetTableCount(
        conn,
        ApplicationDbTable.begin_request
      );

      expect(beginRequestTargetCount).toBe(10);
    });

    it("should throw an error if database query fails", async () => {
      const mockQueryError = new Error("Generic merge error");
      const mockError = genericInternalError(
        `Error merging staging to target ${beginRequestTable} table: ${mockQueryError}`
      );

      const beginRequestMsgs =
        getMockApplicationAudits<ApplicationAuditBeginRequest>(5, 0, 0, 0);

      await beginRequestRepo.batchInsert(beginRequestMsgs);

      vi.spyOn(conn, "none").mockRejectedValue(mockQueryError);

      await expect(
        beginRequestRepo.mergeStagingToTarget()
      ).rejects.toThrowError(mockError);
    });
  });

  describe("cleanStaging", () => {
    it("should truncate staging table successfully after merge", async () => {
      const beginRequestMsgs =
        getMockApplicationAudits<ApplicationAuditBeginRequest>(10, 0, 0, 0);

      await beginRequestRepo.batchInsert(beginRequestMsgs);
      await beginRequestRepo.mergeStagingToTarget();
      await beginRequestRepo.cleanStaging();

      const beginRequestTargetCount = await getStagingTableCount(
        dbContext.conn,
        beginRequestStagingTable
      );
      expect(beginRequestTargetCount).toBe(0);
    });
  });
});
