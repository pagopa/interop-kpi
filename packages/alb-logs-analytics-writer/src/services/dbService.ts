/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { DB, IMain } from "pagopa-interop-kpi-commons";
import { LoadBalancerLog } from "../model/load-balancer-log.js";
import { loadBalancerLogRepository } from "../repositories/loadBalancerLog.repository.js";

export function dbServiceBuilder(db: DB) {
  const pgp: IMain = db.$config.pgp;

  return {
    async insertRecordsToStaging(records: LoadBalancerLog[]): Promise<void> {
      await loadBalancerLogRepository(db).insert(pgp, records);
    },

    async mergeStagingToTarget(): Promise<void> {
      await loadBalancerLogRepository(db).merge();
    },

    async cleanStaging(): Promise<void> {
      await loadBalancerLogRepository(db).clean();
    },
  };
}

export type DBService = ReturnType<typeof dbServiceBuilder>;
