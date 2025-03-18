import { afterEach, describe, expect, it } from "vitest";
import {
  dbContext,
  getMockApplicationAudits,
  getStagingTableCount,
  truncateTables,
} from "./utils.js";
import {
  ApplicationAuditBeginRequest,
  ApplicationDbTable,
  genericInternalError,
} from "pagopa-interop-kpi-models";
import { config } from "../src/config/config.js";
import { beginRequestRepository } from "../src/repositories/beginRequest.repository.js";

describe("Begin request messages handler tests", () => {
  const { conn, pgp } = dbContext;
  const beginRequestStagingTableName = `${ApplicationDbTable.begin_request}${config.mergeTableSuffix}`;
  const endRequestStagingTableName = `${ApplicationDbTable.end_request}${config.mergeTableSuffix}`;
  const temporaryDbSchemaName = "pg_temp";

  const beginRequestRepo = beginRequestRepository(conn, pgp);

  afterEach(async () => {
    const stagingTables = [
      beginRequestStagingTableName,
      endRequestStagingTableName,
    ];
    await truncateTables(conn, temporaryDbSchemaName, stagingTables);

    const targetTables = [
      ApplicationDbTable.begin_request,
      ApplicationDbTable.end_request,
    ];
    await truncateTables(conn, config.dbSchemaName, targetTables);
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

      expect(beginRequestRepo.batchInsert([])).rejects.toThrowError(
        genericInternalError(
          `Error inserting into begin_request staging table: ${mockQueryError}`
        )
      );
    });
  });
});
