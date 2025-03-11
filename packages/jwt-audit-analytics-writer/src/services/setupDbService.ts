/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { DBConnection } from "pagopa-interop-kpi-commons";
import { JwtGeneratedDbTable } from "pagopa-interop-kpi-models";
import { config } from "../config/config.js";
import { setupStagingTablesError } from "../model/domain/errors.js";

export function setupDbServiceBuilder(conn: DBConnection) {
  const generatedTokenTable = JwtGeneratedDbTable.generated_token;
  const clientAssertionTable = JwtGeneratedDbTable.client_assertion;

  return {
    async setupStagingTables(): Promise<void> {
      try {
        const createClientAssertionTableQuery = `
          CREATE TEMPORARY TABLE IF NOT EXISTS ${clientAssertionTable}${config.mergeTableSuffix} (
            LIKE ${config.dbSchemaName}.${clientAssertionTable}
          );
        `;

        const createGeneratedTokenTableQuery = `
          CREATE TEMPORARY TABLE IF NOT EXISTS ${generatedTokenTable}${config.mergeTableSuffix} (
            LIKE ${config.dbSchemaName}.${generatedTokenTable}
          );
        `;

        await conn.query(createClientAssertionTableQuery);
        await conn.query(createGeneratedTokenTableQuery);
      } catch (error: unknown) {
        throw setupStagingTablesError(error);
      }
    },
  };
}

export type SetupDBServiceService = ReturnType<typeof setupDbServiceBuilder>;
