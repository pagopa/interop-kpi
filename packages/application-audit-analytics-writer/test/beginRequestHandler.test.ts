import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApplicationAuditBeginRequest,
  ApplicationDbTable,
  genericInternalError,
} from "pagopa-interop-kpi-models";
import { genericLogger } from "pagopa-interop-kpi-commons";
import { config } from "../src/config/config.js";
import { beginRequestRepository } from "../src/repositories/beginRequest.repository.js";
import { handleBeginRequestMessages } from "../src/handlers/beginRequestHandler.js";
import {
  dbContext,
  getMockApplicationAudits,
  getStagingTableCount,
  getTargetTableCount,
  truncateTables,
} from "./utils.js";

describe("Begin request messages handler tests", () => {
  const { conn, pgp } = dbContext;
  const beginRequestStagingTableName = `${ApplicationDbTable.begin_request}${config.mergeTableSuffix}`;
  const temporaryDbSchemaName = "pg_temp";

  const beginRequestRepo = beginRequestRepository(conn, pgp);

  afterEach(async () => {
    vi.restoreAllMocks();

    const stagingTables = [beginRequestStagingTableName];
    await truncateTables(conn, temporaryDbSchemaName, stagingTables);

    const targetTables = [ApplicationDbTable.begin_request];
    await truncateTables(conn, config.dbSchemaName, targetTables);
  });

  describe("handleBeginRequestMessages", () => {
    it("should trigger staging table cleanup if an error occurs and at least one message is processed", async () => {
      const mockQueryError = new Error("Generic merge error");
      const mockError = genericInternalError(
        `Error merging staging to target begin_request table: ${mockQueryError}`
      );

      const beginRequestMsgs =
        getMockApplicationAudits<ApplicationAuditBeginRequest>(10, 0);

      vi.spyOn(genericLogger, "warn");
      vi.spyOn(beginRequestRepo, "cleanStaging");
      vi.spyOn(beginRequestRepo, "mergeStagingToTarget").mockRejectedValue(
        mockError
      );

      await expect(
        handleBeginRequestMessages(
          beginRequestMsgs,
          beginRequestRepo,
          genericLogger
        )
      ).rejects.toThrowError();

      const beginRequestStagingCount = await getStagingTableCount(
        conn,
        beginRequestStagingTableName
      );

      expect(genericLogger.warn).toHaveBeenCalled();
      expect(beginRequestRepo.cleanStaging).toHaveBeenCalled();
      expect(beginRequestStagingCount).toBe(0);
    });
  });

  describe("batchInsert", () => {
    it("should insert application audit events successfully", async () => {
      const beginRequestMsgs =
        getMockApplicationAudits<ApplicationAuditBeginRequest>(10, 0);

      await beginRequestRepo.batchInsert(beginRequestMsgs);

      const beginRequestStagingCount = await getStagingTableCount(
        conn,
        beginRequestStagingTableName
      );

      expect(beginRequestStagingCount).toBe(10);
    });

    it("should throw an error if database query fails", async () => {
      const mockQueryError =
        "TypeError: Cannot generate an INSERT from an empty array.";
      const mockError = genericInternalError(
        `Error inserting into begin_request staging table: ${mockQueryError}`
      );

      await expect(beginRequestRepo.batchInsert([])).rejects.toThrowError(
        mockError
      );
    });
  });

  describe("mergeStagingToTarget", () => {
    it("should merge staging data into target tables successfully", async () => {
      const beginRequestMsgs =
        getMockApplicationAudits<ApplicationAuditBeginRequest>(10, 0);

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
        `Error merging staging to target begin_request table: ${mockQueryError}`
      );

      const beginRequestMsgs =
        getMockApplicationAudits<ApplicationAuditBeginRequest>(5, 0);

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
        getMockApplicationAudits<ApplicationAuditBeginRequest>(10, 0);

      await beginRequestRepo.batchInsert(beginRequestMsgs);
      await beginRequestRepo.mergeStagingToTarget();
      await beginRequestRepo.cleanStaging();

      const beginRequestTargetCount = await getStagingTableCount(
        dbContext.conn,
        beginRequestStagingTableName
      );
      expect(beginRequestTargetCount).toBe(0);
    });
  });
});
