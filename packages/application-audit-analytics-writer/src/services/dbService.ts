/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { genericLogger } from "pagopa-interop-kpi-commons";
import {
  ApplicationAuditBeginRequest,
  ApplicationAuditEndRequest,
} from "pagopa-interop-kpi-models";

export function dbServiceBuilder() {
  return {
    async insertBeginRequest(
      data: ApplicationAuditBeginRequest
    ): Promise<void> {
      genericLogger.info(`insertBeginRequest operation: ${data}`);
    },
    async insertEndRequest(data: ApplicationAuditEndRequest): Promise<void> {
      genericLogger.info(`insertEndRequest operation: ${data}`);
    },
  };
}

export type DBService = ReturnType<typeof dbServiceBuilder>;
