/* eslint-disable @typescript-eslint/explicit-function-return-type */
import {
  DBConnection,
  IMain,
  buildColumnSet,
  generateMergeQuery,
} from "pagopa-interop-kpi-commons";
import {
  ApplicationAuditEndRequest,
  ApplicationDbTable,
  genericInternalError,
} from "pagopa-interop-kpi-models";
import { config } from "../config/config.js";
import {
  ApplicationAuditEndRequestMapping,
  ApplicationAuditEndRequestSchema,
} from "../model/db.js";

export const endRequestMapping: ApplicationAuditEndRequestMapping = {
  span_id: (event) => event.spanId,
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
  timestamp: (event) => event.timestamp,
  timestamp_tz: (event) => new Date(event.timestamp),
  amazon_trace_id: (event) => event.amazonTraceId,
  organization_id: (event) => event.organizationId,
  user_id: (event) => event.userId,
  http_response_status: (event) => event.httpResponseStatus,
  execution_time_ms: (event) => event.executionTimeMs,
};

export function endRequestRepository(conn: DBConnection, pgp: IMain) {
  const endRequestTable = ApplicationDbTable.end_request;
  const endRequestStagingTable = `${endRequestTable}${config.mergeTableSuffix}`;

  return {
    async copyFromS3ToStaging(s3ObjectKey: string): Promise<void> {
      try {
        const copyQuery = `
          COPY ${endRequestTable}
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
          `Error copying data from S3 to staging ${endRequestTable}: ${error}`
        );
      }
    },

    async insertToStaging(events: ApplicationAuditEndRequest[]): Promise<void> {
      try {
        const endRequestColumnSet = buildColumnSet<ApplicationAuditEndRequest>(
          pgp,
          endRequestMapping,
          endRequestStagingTable
        );

        await conn.none(pgp.helpers.insert(events, endRequestColumnSet));
      } catch (error: unknown) {
        throw genericInternalError(
          `Error inserting into ${endRequestStagingTable} staging table: ${error}`
        );
      }
    },

    async mergeStagingToTarget(): Promise<void> {
      try {
        const endRequestMergeQuery = generateMergeQuery(
          ApplicationAuditEndRequestSchema,
          config.dbSchemaName,
          endRequestTable,
          config.mergeTableSuffix,
          ["span_id"]
        );
        await conn.none(endRequestMergeQuery);
      } catch (error: unknown) {
        throw genericInternalError(
          `Error merging staging to target ${endRequestTable} table: ${error}`
        );
      }
    },

    async cleanStaging(): Promise<void> {
      try {
        await conn.none(`TRUNCATE TABLE ${endRequestStagingTable};`);
      } catch (error: unknown) {
        throw genericInternalError(
          `Error cleaning staging ${endRequestStagingTable} table: ${error}`
        );
      }
    },
  };
}

export type EndRequestRepository = ReturnType<typeof endRequestRepository>;
