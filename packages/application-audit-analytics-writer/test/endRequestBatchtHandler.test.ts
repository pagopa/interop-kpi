import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApplicationAuditEndRequest,
  ApplicationDbTable,
  genericInternalError,
} from "pagopa-interop-kpi-models";
import { genericLogger } from "pagopa-interop-kpi-commons";
import { config } from "../src/config/config.js";
import {
  endRequestMapping,
  EndRequestRepository,
  endRequestRepository,
} from "../src/repositories/endRequest.repository.js";
import { processBatch } from "../src/handlers/batchHandler.js";
import { ApplicationAuditEndRequestSchema } from "../src/model/db.js";
import {
  dbContext,
  fileManager,
  getMockApplicationAudits,
  getStagingTableCount,
  getTargetTableCount,
  getTargetTableRows,
  truncateTables,
} from "./utils.js";

describe("End request batch handler tests", () => {
  const { conn, pgp } = dbContext;
  const endRequestTable = ApplicationDbTable.end_request;
  const endRequestStagingTable = `${endRequestTable}${config.mergeTableSuffix}`;
  const temporaryDbSchemaName = "pg_temp";

  const endRequestRepo = endRequestRepository(conn, pgp);

  afterEach(async () => {
    vi.restoreAllMocks();

    const stagingTables = [endRequestStagingTable];
    await truncateTables(conn, temporaryDbSchemaName, stagingTables);

    const targetTables = [endRequestTable];
    await truncateTables(conn, config.dbSchemaName, targetTables);
  });

  describe("processBatch", () => {
    it("should trigger staging table cleanup if an error occurs and at least one message is processed", async () => {
      const mockQueryError = new Error("Generic merge error");
      const mockError = genericInternalError(
        `Error merging staging to target ${endRequestTable} table: ${mockQueryError}`
      );

      const endRequestMsgs =
        getMockApplicationAudits<ApplicationAuditEndRequest>(0, 10, 0, 0);

      vi.spyOn(genericLogger, "warn");
      vi.spyOn(endRequestRepo, "cleanStaging");
      vi.spyOn(endRequestRepo, "mergeStagingToTarget").mockRejectedValue(
        mockError
      );

      await expect(
        processBatch<ApplicationAuditEndRequest, EndRequestRepository>(
          endRequestMsgs,
          endRequestRepo,
          ApplicationDbTable.end_request,
          endRequestMapping,
          fileManager,
          genericLogger
        )
      ).rejects.toThrowError();

      const endRequestStagingCount = await getStagingTableCount(
        conn,
        endRequestStagingTable
      );

      expect(genericLogger.warn).toHaveBeenCalled();
      expect(endRequestRepo.cleanStaging).toHaveBeenCalled();
      expect(endRequestStagingCount).toBe(0);
    });
  });

  describe("insertToStaging", () => {
    it("should insert application audit events successfully", async () => {
      const endRequestMsgs =
        getMockApplicationAudits<ApplicationAuditEndRequest>(0, 10, 0, 0);

      await endRequestRepo.insertToStaging(endRequestMsgs);

      const endRequestStagingCount = await getStagingTableCount(
        conn,
        endRequestStagingTable
      );

      expect(endRequestStagingCount).toBe(10);
    });

    it("should throw an error if database query fails", async () => {
      const mockQueryError =
        "TypeError: Cannot generate an INSERT from an empty array.";
      const mockError = genericInternalError(
        `Error inserting into ${endRequestStagingTable} staging table: ${mockQueryError}`
      );

      await expect(endRequestRepo.insertToStaging([])).rejects.toThrowError(
        mockError
      );
    });
  });

  describe("mergeStagingToTarget", () => {
    it("should merge staging data into target tables successfully", async () => {
      const endRequestMsgs =
        getMockApplicationAudits<ApplicationAuditEndRequest>(0, 10, 0, 0);

      await endRequestRepo.insertToStaging(endRequestMsgs);
      await endRequestRepo.mergeStagingToTarget();

      const endRequestTargetCount = await getTargetTableCount(
        conn,
        ApplicationDbTable.end_request
      );

      expect(endRequestTargetCount).toBe(10);
    });

    it("should persist jwtId data correctly", async () => {
      const endRequestMsgs =
        getMockApplicationAudits<ApplicationAuditEndRequest>(0, 10, 0, 0);

      await endRequestRepo.insertToStaging(endRequestMsgs);
      await endRequestRepo.mergeStagingToTarget();

      const rows = await getTargetTableRows<ApplicationAuditEndRequestSchema>(
        conn,
        ApplicationDbTable.end_request
      );

      rows.forEach((row) => {
        expect(row).toHaveProperty("jwt_id");
        expect(row.jwt_id).toBeTruthy();
      });
    });

    it("should throw an error if database query fails", async () => {
      const mockQueryError = new Error("Generic merge error");
      const mockError = genericInternalError(
        `Error merging staging to target ${endRequestTable} table: ${mockQueryError}`
      );

      const endRequestMsgs =
        getMockApplicationAudits<ApplicationAuditEndRequest>(0, 10, 0, 0);

      await endRequestRepo.insertToStaging(endRequestMsgs);

      vi.spyOn(conn, "none").mockRejectedValue(mockQueryError);

      await expect(endRequestRepo.mergeStagingToTarget()).rejects.toThrowError(
        mockError
      );
    });
  });

  describe("cleanStaging", () => {
    it("should truncate staging table successfully after merge", async () => {
      const endRequestMsgs =
        getMockApplicationAudits<ApplicationAuditEndRequest>(0, 10, 0, 0);

      await endRequestRepo.insertToStaging(endRequestMsgs);
      await endRequestRepo.mergeStagingToTarget();
      await endRequestRepo.cleanStaging();

      const endRequestTargetCount = await getStagingTableCount(
        dbContext.conn,
        endRequestStagingTable
      );
      expect(endRequestTargetCount).toBe(0);
    });
  });
});
