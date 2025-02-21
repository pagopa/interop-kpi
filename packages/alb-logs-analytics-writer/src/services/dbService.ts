/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { DB } from "pagopa-interop-kpi-commons";
import { AlbLogsAuditDetails } from "pagopa-interop-kpi-models";

export function dbServiceBuilder(_db: DB) {
  return {
    async insertStagingRecords(records: AlbLogsAuditDetails[]): Promise<void> {
      Promise.resolve(records);
    },

    async mergeData(): Promise<void> {
      Promise.resolve();
    },
  };
}

export type DBService = ReturnType<typeof dbServiceBuilder>;
