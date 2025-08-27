/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { setupStagingTablesError } from "pagopa-interop-kpi-models";
import { DBConnection } from "../index.js";

export interface SetupDbConfig {
  mergeTableSuffix: string;
  dbSchemaName: string;
}

export function setupDbServiceBuilder(
  conn: DBConnection,
  config: SetupDbConfig
) {
  return {
    async setupStagingTables(tableNames: string[]): Promise<void> {
      try {
        await Promise.all(
          tableNames.map((tableName) => {
            const query = `
              CREATE TEMPORARY TABLE IF NOT EXISTS ${tableName}${config.mergeTableSuffix} (
                _seq BIGINT GENERATED ALWAYS AS IDENTITY,
                LIKE ${config.dbSchemaName}.${tableName}
              );
            `;
            return conn.query(query);
          })
        );
      } catch (error: unknown) {
        throw setupStagingTablesError(error);
      }
    },
  };
}

export type SetupDBServiceService = ReturnType<typeof setupDbServiceBuilder>;
