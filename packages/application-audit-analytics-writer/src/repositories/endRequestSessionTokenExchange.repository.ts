/* eslint-disable @typescript-eslint/explicit-function-return-type */
import {
  DBConnection,
  IMain,
  buildColumnSet,
  generateMergeQuery,
} from "pagopa-interop-kpi-commons";
import {
  ApplicationAuditEndRequestSessionTokenExchange,
  ApplicationDbTable,
  genericInternalError,
} from "pagopa-interop-kpi-models";
import { config } from "../config/config.js";
import {
  ApplicationAuditEndRequestSessionTokenExchangeMapping,
  ApplicationAuditEndRequestSessionTokenExchangeSchema,
} from "../model/db.js";

export function endRequestSessionTokenExchangeRepository(
  conn: DBConnection,
  pgp: IMain
) {
  const endRequestSessionTokenExchangeTable =
    ApplicationDbTable.end_request_session_token_exchange;
  const endRequestSessionTokenExchangeStagingTable = `${endRequestSessionTokenExchangeTable}${config.mergeTableSuffix}`;

  return {
    async batchInsert(
      events: ApplicationAuditEndRequestSessionTokenExchange[]
    ): Promise<void> {
      try {
        const endRequestSessionTokenExchangeMapping: ApplicationAuditEndRequestSessionTokenExchangeMapping =
          {
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
            organization_id: (event) => event.organizationId,
            http_response_status: (event) => event.httpResponseStatus,
            execution_time_ms: (event) => event.executionTimeMs,
            self_care_id: (event) => event.selfcareId,
          };

        const endRequestSessionTokenExchangeColumnSet =
          buildColumnSet<ApplicationAuditEndRequestSessionTokenExchange>(
            pgp,
            endRequestSessionTokenExchangeMapping,
            endRequestSessionTokenExchangeStagingTable
          );

        await conn.none(
          pgp.helpers.insert(events, endRequestSessionTokenExchangeColumnSet)
        );
      } catch (error: unknown) {
        throw genericInternalError(
          `Error inserting into ${endRequestSessionTokenExchangeStagingTable} staging table: ${error}`
        );
      }
    },

    async mergeStagingToTarget(): Promise<void> {
      try {
        const eendRequestSessionTokenExchangeMergeQuery = generateMergeQuery(
          ApplicationAuditEndRequestSessionTokenExchangeSchema,
          config.dbSchemaName,
          endRequestSessionTokenExchangeTable,
          config.mergeTableSuffix,
          ["correlation_id", "service"]
        );
        await conn.none(eendRequestSessionTokenExchangeMergeQuery);
      } catch (error: unknown) {
        throw genericInternalError(
          `Error merging staging to target ${endRequestSessionTokenExchangeTable} table: ${error}`
        );
      }
    },

    async cleanStaging(): Promise<void> {
      try {
        await conn.none(
          `TRUNCATE TABLE ${endRequestSessionTokenExchangeStagingTable};`
        );
      } catch (error: unknown) {
        throw genericInternalError(
          `Error cleaning staging ${endRequestSessionTokenExchangeStagingTable} table: ${error}`
        );
      }
    },
  };
}

export type EndRequestSessionTokenExchangeRepository = ReturnType<
  typeof endRequestSessionTokenExchangeRepository
>;
