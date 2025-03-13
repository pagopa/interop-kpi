/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { DBConnection } from "pagopa-interop-kpi-commons";
import { LoadBalancerLogTable } from "pagopa-interop-kpi-models";
import { config } from "../config/config.js";
import { setupStagingTablesError } from "../model/errors.js";

export function setupDbServiceBuilder(conn: DBConnection) {
  const loadBalancerTableName = LoadBalancerLogTable.logs;

  return {
    async setupStagingTables(): Promise<void> {
      try {
        const createLoadBalancerLogTableQuery = `
          CREATE TEMPORARY TABLE IF NOT EXISTS ${loadBalancerTableName}${config.mergeTableSuffix} (
            LIKE ${config.dbSchemaName}.${loadBalancerTableName}
          );
        `;
        await conn.query(createLoadBalancerLogTableQuery);
      } catch (error: unknown) {
        throw setupStagingTablesError(error);
      }
    },
  };
}

export type SetupDBServiceService = ReturnType<typeof setupDbServiceBuilder>;
