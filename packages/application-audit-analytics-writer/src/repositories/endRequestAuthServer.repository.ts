/* eslint-disable @typescript-eslint/explicit-function-return-type */
import {
  DBConnection,
  IMain,
  buildColumnSet,
  generateMergeQuery,
} from "pagopa-interop-kpi-commons";
import {
  ApplicationAuditEndRequestAuthServer,
  ApplicationDbTable,
  genericInternalError,
} from "pagopa-interop-kpi-models";
import { config } from "../config/config.js";
import {
  ApplicationAuditEndRequestAuthServerMapping,
  ApplicationAuditEndRequestAuthServerSchema,
} from "../model/db.js";

export function endRequestAuthServerRepository(conn: DBConnection, pgp: IMain) {
  const endRequestAuthServerTable = ApplicationDbTable.end_request_auth_server;
  const endRequestAuthServerStagingTable = `${endRequestAuthServerTable}${config.mergeTableSuffix}`;

  return {
    async batchInsert(
      events: ApplicationAuditEndRequestAuthServer[]
    ): Promise<void> {
      try {
        const endRequestAuthServerMapping: ApplicationAuditEndRequestAuthServerMapping =
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
            client_id: (event) => event.clientId,
          };

        const endRequestAuthServerColumnSet =
          buildColumnSet<ApplicationAuditEndRequestAuthServer>(
            pgp,
            endRequestAuthServerMapping,
            endRequestAuthServerStagingTable
          );

        await conn.none(
          pgp.helpers.insert(events, endRequestAuthServerColumnSet)
        );
      } catch (error: unknown) {
        throw genericInternalError(
          `Error inserting into ${endRequestAuthServerStagingTable} staging table: ${error}`
        );
      }
    },

    async mergeStagingToTarget(): Promise<void> {
      try {
        const endRequestAuthServerMergeQuery = generateMergeQuery(
          ApplicationAuditEndRequestAuthServerSchema,
          config.dbSchemaName,
          endRequestAuthServerTable,
          config.mergeTableSuffix,
          "correlation_id"
        );
        await conn.none(endRequestAuthServerMergeQuery);
      } catch (error: unknown) {
        throw genericInternalError(
          `Error merging staging to target ${endRequestAuthServerTable} table: ${error}`
        );
      }
    },

    async cleanStaging(): Promise<void> {
      try {
        await conn.none(`TRUNCATE TABLE ${endRequestAuthServerStagingTable};`);
      } catch (error: unknown) {
        throw genericInternalError(
          `Error cleaning staging ${endRequestAuthServerStagingTable} table: ${error}`
        );
      }
    },
  };
}

export type EndRequestAuthServerRepository = ReturnType<
  typeof endRequestAuthServerRepository
>;
