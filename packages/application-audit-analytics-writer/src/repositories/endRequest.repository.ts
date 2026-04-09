/* eslint-disable @typescript-eslint/explicit-function-return-type */
import {
  DBConnection,
  IMain,
  buildColumnSet,
  generateDeduplicationQuery,
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
  user_id: (event) => event.userId,
};

export function endRequestRepository(conn: DBConnection, pgp: IMain) {
  const endRequestTable = ApplicationDbTable.end_request;
  const endRequestStagingTable = `${endRequestTable}${config.mergeTableSuffix}`;

  return {
    async copyFromS3ToStaging(s3ObjectKey: string): Promise<void> {
      try {
        const copyQuery = `
          COPY ${endRequestStagingTable}
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
          `Error copying data from S3 to staging ${endRequestStagingTable}: ${error}`
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
          ["span_id"],
          {
            joinTimeFilterColumn: "timestamp_tz",
            maxDaysTolerance: config.maxDaysToleranceForDuplicateDelay,
          }
        );
        await conn.none(endRequestMergeQuery);
      } catch (error: unknown) {
        throw genericInternalError(
          `Error merging staging to target ${endRequestTable} table: ${error}`
        );
      }
    },

    async deduplicateStaging(): Promise<void> {
      try {
        const deduplicationQuery = generateDeduplicationQuery(
          endRequestStagingTable,
          "span_id",
          "timestamp"
        );
        await conn.none(deduplicationQuery);
      } catch (error: unknown) {
        throw genericInternalError(
          `Error deduplicating staging ${endRequestStagingTable} table: ${error}`
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
