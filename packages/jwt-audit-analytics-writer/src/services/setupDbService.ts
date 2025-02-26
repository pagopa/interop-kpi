/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { DB } from "pagopa-interop-kpi-commons";
import { config } from "../config/config.js";
import { JwtGeneratedDatabaseTable } from "../model/db.js";
import { setupStagingTablesError } from "../model/domain/errors.js";

export function setupDbServiceBuilder(db: DB) {
  const generatedTokenTable = JwtGeneratedDatabaseTable.generated_token;
  const clientAssertionTable = JwtGeneratedDatabaseTable.client_assertion;

  return {
    async setupStagingTables(): Promise<void> {
      try {
        const createClientAssertionTableQuery = `
        CREATE TABLE IF NOT EXISTS ${config.dbSchemaName}.${clientAssertionTable}${config.mergeTableSuffix} (
          LIKE ${config.dbSchemaName}.${clientAssertionTable}
        );
      `;

        const createGeneratedTokenTableQuery = `
        CREATE TABLE IF NOT EXISTS ${config.dbSchemaName}.${generatedTokenTable}${config.mergeTableSuffix} (
          LIKE ${config.dbSchemaName}.${generatedTokenTable}
        );
      `;

        await db.query(createClientAssertionTableQuery);
        await db.query(createGeneratedTokenTableQuery);
      } catch (error: unknown) {
        throw setupStagingTablesError(error);
      }
    },
  };
}

export type SetupDBServiceService = ReturnType<typeof setupDbServiceBuilder>;
