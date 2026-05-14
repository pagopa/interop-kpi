import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApplicationAuditEndRequestSessionTokenExchange,
  ApplicationDbTable,
} from "pagopa-interop-kpi-models";
import { config } from "../src/config/config.js";
import { endRequestSessionTokenExchangeRepository } from "../src/repositories/endRequestSessionTokenExchange.repository.js";
import { ApplicationAuditEndRequestSessionTokenExchangeSchema } from "../src/model/db.js";
import {
  dbContext,
  getMockApplicationAudits,
  getTargetTableRows,
  truncateTables,
} from "./utils.js";

describe("End request session token exchange tests", () => {
  const { conn, pgp } = dbContext;
  const endRequestTable = ApplicationDbTable.end_request_session_token_exchange;
  const endRequestStagingTable = `${endRequestTable}${config.mergeTableSuffix}`;
  const temporaryDbSchemaName = "pg_temp";

  const sessionTokenExchangeRepository =
    endRequestSessionTokenExchangeRepository(conn, pgp);

  afterEach(async () => {
    vi.restoreAllMocks();

    const stagingTables = [endRequestStagingTable];
    await truncateTables(conn, temporaryDbSchemaName, stagingTables);

    const targetTables = [endRequestTable];
    await truncateTables(conn, config.dbSchemaName, targetTables);
  });

  it("should persist jwtId data correctly", async () => {
    const endRequestMsgs =
      getMockApplicationAudits<ApplicationAuditEndRequestSessionTokenExchange>(
        0,
        10,
        0,
        0
      );

    await sessionTokenExchangeRepository.insertToStaging(endRequestMsgs);
    await sessionTokenExchangeRepository.mergeStagingToTarget();

    const rows =
      await getTargetTableRows<ApplicationAuditEndRequestSessionTokenExchangeSchema>(
        conn,
        ApplicationDbTable.end_request
      );

    rows.forEach((row) => {
      expect(row).toHaveProperty("request_jwt_id");
      expect(row).toHaveProperty("produced_jwt_id");
      expect(row.request_jwt_id).toBeTruthy();
      expect(row.produced_jwt_id).toBeTruthy();
    });
  });
});
