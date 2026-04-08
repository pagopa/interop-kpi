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

export const endRequestAuthServerMapping: ApplicationAuditEndRequestAuthServerMapping =
  {
    correlation_id: (event) => event.correlationId,
    span_id: (event) => event.spanId,
    service: (event) => event.service,
    service_version: (event) => event.serviceVersion,
    endpoint: (event) => event.endpoint,
    http_method: (event) => event.httpMethod,
    phase: (event) => event.phase,
    requester_ip_address: (event) => event.requesterIpAddress,
    node_ip: (event) => event.nodeIp,
    pod_name: (event) => event.podName,
    uptime_seconds: (event) => event.uptimeSeconds,
    timestamp: (event) => event.timestamp,
    timestamp_tz: (event) => new Date(event.timestamp),
    amazon_trace_id: (event) => event.amazonTraceId,
    organization_id: (event) => event.organizationId,
    http_response_status: (event) => event.httpResponseStatus,
    execution_time_ms: (event) => event.executionTimeMs,
    client_id: (event) => event.clientId,
    client_kind: (event) => event.clientKind,
  };

export function endRequestAuthServerRepository(conn: DBConnection, pgp: IMain) {
  const endRequestAuthServerTable = ApplicationDbTable.end_request_auth_server;
  const endRequestAuthServerStagingTable = `${endRequestAuthServerTable}${config.mergeTableSuffix}`;

  return {
    async copyFromS3ToStaging(s3ObjectKey: string): Promise<void> {
      try {
        const copyQuery = `
          COPY ${endRequestAuthServerStagingTable}
          FROM 's3://${config.s3CopyBucket}/${s3ObjectKey}'
          IAM_ROLE '${config.redshiftIamRole}'
          CSV
          GZIP
          TIMEFORMAT 'auto'
          BLANKSASNULL
          EMPTYASNULL;
        `;

        await conn.none(copyQuery);
      } catch (error: unknown) {
        throw genericInternalError(
          `Error copying data from S3 to staging ${endRequestAuthServerStagingTable}: ${error}`
        );
      }
    },

    async insertToStaging(
      events: ApplicationAuditEndRequestAuthServer[]
    ): Promise<void> {
      try {
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
          ["span_id"],
          {
            joinTimeFilterColumn: "timestamp_tz",
            maxDaysTolerance: config.maxDaysToleranceForDuplicateDelay,
          }
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
