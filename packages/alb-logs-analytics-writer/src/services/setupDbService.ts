/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { DB } from "pagopa-interop-kpi-commons";
import { config } from "../config/config.js";
import { LoadBalancerLogTable } from "../model/db.js";
import { setupStagingTablesError } from "../model/errors.js";

export function setupDbServiceBuilder(db: DB) {
  const loadBalancerTableName = LoadBalancerLogTable.logs;

  return {
    async setupStagingTables(): Promise<void> {
      try {
        const createLoadBalancerLogTableQuery = `
          CREATE TABLE IF NOT EXISTS ${config.dbSchemaName}.${loadBalancerTableName}${config.mergeTableSuffix} (
            LIKE ${config.dbSchemaName}.${loadBalancerTableName}
          );
        `;
        await db.query(createLoadBalancerLogTableQuery);
      } catch (error: unknown) {
        throw setupStagingTablesError(error);
      }
    },
  };
}

export type SetupDBServiceService = ReturnType<typeof setupDbServiceBuilder>;
