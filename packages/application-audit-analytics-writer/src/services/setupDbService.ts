/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { DBConnection } from "pagopa-interop-kpi-commons";
import {
  ApplicationDbTable,
  setupStagingTablesError,
} from "pagopa-interop-kpi-models";
import { config } from "../config/config.js";

export function setupDbServiceBuilder(conn: DBConnection) {
  const beginRequestTable = ApplicationDbTable.begin_request;
  const endRequestTable = ApplicationDbTable.end_request;

  return {
    async setupStagingTables(): Promise<void> {
      try {
        const createbeginRequestTableQuery = `
          CREATE TEMPORARY TABLE IF NOT EXISTS ${beginRequestTable}${config.mergeTableSuffix} (
            LIKE ${config.dbSchemaName}.${beginRequestTable}
          );
        `;

        const createEndRequestTableTableQuery = `
          CREATE TEMPORARY TABLE IF NOT EXISTS ${endRequestTable}${config.mergeTableSuffix} (
            LIKE ${config.dbSchemaName}.${endRequestTable}
          );
        `;

        await conn.query(createbeginRequestTableQuery);
        await conn.query(createEndRequestTableTableQuery);
      } catch (error: unknown) {
        throw setupStagingTablesError(error);
      }
    },
  };
}

export type SetupDBServiceService = ReturnType<typeof setupDbServiceBuilder>;
