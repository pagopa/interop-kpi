/* eslint-disable @typescript-eslint/explicit-function-return-type */
import {
  DBConnection,
  IMain,
  buildColumnSet,
  generateMergeQuery,
} from "pagopa-interop-kpi-commons";
import {
  ApplicationAuditBeginRequest,
  ApplicationDbTable,
  genericInternalError,
} from "pagopa-interop-kpi-models";
import { config } from "../config/config.js";
import {
  ApplicationAuditBeginRequestMapping,
  ApplicationAuditBeginRequestSchema,
} from "../model/db.js";

export function beginRequestRepository(conn: DBConnection, pgp: IMain) {
  const beginRequestTable = ApplicationDbTable.begin_request;
  const beginRequestStagingTable = `${beginRequestTable}${config.mergeTableSuffix}`;

  return {
    async batchInsert(events: ApplicationAuditBeginRequest[]): Promise<void> {
      try {
        const beginRequestMapping: ApplicationAuditBeginRequestMapping = {
          correlation_id: (event) => event.correlationId,
          service: (event) => event.service,
          service_version: (event) => event.serviceVersion,
          endpoint: (event) => event.endpoint,
          http_method: (event) => event.httpMethod,
          phase: (event) => event.phase,
          requester_ip_address: (event) => event.requesterIpAddress,
          node_ip: (event) => event.nodeIp,
          pod_name: (event) => event.podName,
          uptime_seconds: (event) => event.uptimeSeconds,
          timestamp: (event) => new Date(event.timestamp),
          amazon_trace_id: (event) => event.amazonTraceId,
        };

        const beginRequestColumnSet =
          buildColumnSet<ApplicationAuditBeginRequest>(
            pgp,
            beginRequestMapping,
            beginRequestStagingTable
          );

        await conn.none(pgp.helpers.insert(events, beginRequestColumnSet));
      } catch (error: unknown) {
        throw genericInternalError(
          `Error inserting into ${beginRequestStagingTable} staging table: ${error}`
        );
      }
    },

    async mergeStagingToTarget(): Promise<void> {
      try {
        const beginRequestMergeQuery = generateMergeQuery(
          ApplicationAuditBeginRequestSchema,
          config.dbSchemaName,
          beginRequestTable,
          config.mergeTableSuffix,
          ["correlation_id", "service"]
        );
        await conn.none(beginRequestMergeQuery);
      } catch (error: unknown) {
        throw genericInternalError(
          `Error merging staging to target ${beginRequestTable} table: ${error}`
        );
      }
    },

    async cleanStaging(): Promise<void> {
      try {
        await conn.none(`TRUNCATE TABLE ${beginRequestStagingTable};`);
      } catch (error: unknown) {
        throw genericInternalError(
          `Error cleaning staging ${beginRequestStagingTable} table: ${error}`
        );
      }
    },
  };
}

export type BeginRequestRepository = ReturnType<typeof beginRequestRepository>;
