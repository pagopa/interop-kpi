import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApplicationAuditEndRequest,
  ApplicationDbTable,
  genericInternalError,
} from "pagopa-interop-kpi-models";
import { genericLogger } from "pagopa-interop-kpi-commons";
import { config } from "../src/config/config.js";
import { endRequestRepository } from "../src/repositories/endRequest.repository.js";
import { handleEndRequestMessages } from "../src/handlers/endRequestHandler.js";
import {
  dbContext,
  getMockApplicationAudits,
  getStagingTableCount,
  getTargetTableCount,
  truncateTables,
} from "./utils.js";

describe("End request messages handler tests", () => {
  const { conn, pgp } = dbContext;
  const endRequestStagingTableName = `${ApplicationDbTable.end_request}${config.mergeTableSuffix}`;
  const temporaryDbSchemaName = "pg_temp";

  const endRequestRepo = endRequestRepository(conn, pgp);

  afterEach(async () => {
    vi.restoreAllMocks();

    const stagingTables = [endRequestStagingTableName];
    await truncateTables(conn, temporaryDbSchemaName, stagingTables);

    const targetTables = [ApplicationDbTable.end_request];
    await truncateTables(conn, config.dbSchemaName, targetTables);
  });

  describe("handleEndRequestMessages", () => {
    it("should trigger staging table cleanup if an error occurs and at least one message is processed", async () => {
      const mockQueryError = new Error("Generic merge error");
      const mockError = genericInternalError(
        `Error merging staging to target end_request table: ${mockQueryError}`
      );

      const endRequestMsgs =
        getMockApplicationAudits<ApplicationAuditEndRequest>(0, 10);

      vi.spyOn(genericLogger, "warn");
      vi.spyOn(endRequestRepo, "cleanStaging");
      vi.spyOn(endRequestRepo, "mergeStagingToTarget").mockRejectedValue(
        mockError
      );

      await expect(
        handleEndRequestMessages(endRequestMsgs, endRequestRepo, genericLogger)
      ).rejects.toThrowError();

      const endRequestStagingCount = await getStagingTableCount(
        conn,
        endRequestStagingTableName
      );

      expect(genericLogger.warn).toHaveBeenCalled();
      expect(endRequestRepo.cleanStaging).toHaveBeenCalled();
      expect(endRequestStagingCount).toBe(0);
    });
  });

  describe("batchInsert", () => {
    it("should insert application audit events successfully", async () => {
      const endRequestMsgs =
        getMockApplicationAudits<ApplicationAuditEndRequest>(0, 10);

      await endRequestRepo.batchInsert(endRequestMsgs);

      const endRequestStagingCount = await getStagingTableCount(
        conn,
        endRequestStagingTableName
      );

      expect(endRequestStagingCount).toBe(10);
    });

    it("should throw an error if database query fails", async () => {
      const mockQueryError =
        "TypeError: Cannot generate an INSERT from an empty array.";
      const mockError = genericInternalError(
        `Error inserting into end_request staging table: ${mockQueryError}`
      );

      await expect(endRequestRepo.batchInsert([])).rejects.toThrowError(
        mockError
      );
    });
  });

  describe("mergeStagingToTarget", () => {
    it("should merge staging data into target tables successfully", async () => {
      const endRequestMsgs =
        getMockApplicationAudits<ApplicationAuditEndRequest>(0, 10);

      await endRequestRepo.batchInsert(endRequestMsgs);
      await endRequestRepo.mergeStagingToTarget();

      const endRequestTargetCount = await getTargetTableCount(
        conn,
        ApplicationDbTable.end_request
      );

      expect(endRequestTargetCount).toBe(10);
    });

    it("should throw an error if database query fails", async () => {
      const mockQueryError = new Error("Generic merge error");
      const mockError = genericInternalError(
        `Error merging staging to target end_request table: ${mockQueryError}`
      );

      const endRequestMsgs =
        getMockApplicationAudits<ApplicationAuditEndRequest>(0, 10);

      await endRequestRepo.batchInsert(endRequestMsgs);

      vi.spyOn(conn, "none").mockRejectedValue(mockQueryError);

      await expect(endRequestRepo.mergeStagingToTarget()).rejects.toThrowError(
        mockError
      );
    });
  });

  describe("cleanStaging", () => {
    it("should truncate staging table successfully after merge", async () => {
      const endRequestMsgs =
        getMockApplicationAudits<ApplicationAuditEndRequest>(0, 10);

      await endRequestRepo.batchInsert(endRequestMsgs);
      await endRequestRepo.mergeStagingToTarget();
      await endRequestRepo.cleanStaging();

      const endRequestTargetCount = await getStagingTableCount(
        dbContext.conn,
        endRequestStagingTableName
      );
      expect(endRequestTargetCount).toBe(0);
    });
  });
});
