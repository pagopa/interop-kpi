/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { DBContext } from "pagopa-interop-kpi-commons";
import { LoadBalancerLog } from "../model/load-balancer-log.js";
import { loadBalancerLogRepository } from "../repositories/loadBalancerLog.repository.js";

export function dbServiceBuilder(db: DBContext) {
  return {
    async insertRecordsToStaging(records: LoadBalancerLog[]): Promise<void> {
      await loadBalancerLogRepository(db.conn).insert(db.pgp, records);
    },

    async mergeStagingToTarget(): Promise<void> {
      await loadBalancerLogRepository(db.conn).merge();
    },

    async cleanStaging(): Promise<void> {
      await loadBalancerLogRepository(db.conn).clean();
    },
  };
}

export type DBService = ReturnType<typeof dbServiceBuilder>;
