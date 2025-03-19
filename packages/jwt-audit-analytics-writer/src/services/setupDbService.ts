/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { DBConnection } from "pagopa-interop-kpi-commons";
import { JwtDbTable } from "pagopa-interop-kpi-models";
import { config } from "../config/config.js";
import { setupStagingTablesError } from "../model/domain/errors.js";

export function setupDbServiceBuilder(conn: DBConnection) {
  const generatedTokenTable = JwtDbTable.generated_token;
  const clientAssertionTable = JwtDbTable.client_assertion;

  return {
    async setupStagingTables(): Promise<void> {
      try {
        const createGeneratedTokenTableQuery = `
          CREATE TEMPORARY TABLE IF NOT EXISTS ${generatedTokenTable}${config.mergeTableSuffix} (
            LIKE ${config.dbSchemaName}.${generatedTokenTable}
          );
        `;

        const createClientAssertionTableQuery = `
          CREATE TEMPORARY TABLE IF NOT EXISTS ${clientAssertionTable}${config.mergeTableSuffix} (
            LIKE ${config.dbSchemaName}.${clientAssertionTable}
          );
        `;
        await conn.query(createGeneratedTokenTableQuery);
        await conn.query(createClientAssertionTableQuery);
      } catch (error: unknown) {
        throw setupStagingTablesError(error);
      }
    },
  };
}

export type SetupDBServiceService = ReturnType<typeof setupDbServiceBuilder>;
