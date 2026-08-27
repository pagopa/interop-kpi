/* eslint-disable @typescript-eslint/explicit-function-return-type */
import {
  DBConnection,
  IMain,
  buildColumnSet,
  generateDeduplicationQuery,
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

export const endRequestSessionTokenExchangeMapping: ApplicationAuditEndRequestSessionTokenExchangeMapping =
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
    self_care_id: (event) => event.selfcareId,
    request_jwt_id: (event) => event.requestJwtId,
    produced_jwt_id: (event) => event.producedJwtId,
  };

export function endRequestSessionTokenExchangeRepository(
  conn: DBConnection,
  pgp: IMain
) {
  const endRequestSessionTokenExchangeTable =
    ApplicationDbTable.end_request_session_token_exchange;
  const endRequestSessionTokenExchangeStagingTable = `${endRequestSessionTokenExchangeTable}${config.mergeTableSuffix}`;

  return {
    async copyFromS3ToStaging(s3ObjectKey: string): Promise<void> {
      try {
        const copyQuery = `
          COPY ${endRequestSessionTokenExchangeStagingTable}
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
          `Error copying data from S3 to staging ${endRequestSessionTokenExchangeStagingTable}: ${error}`
        );
      }
    },

    async insertToStaging(
      events: ApplicationAuditEndRequestSessionTokenExchange[]
    ): Promise<void> {
      try {
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
          ["span_id"],
          {
            joinTimeFilterColumn: "timestamp_tz",
            maxDaysTolerance: config.maxDaysToleranceForDuplicateDelay,
          }
        );
        await conn.none(eendRequestSessionTokenExchangeMergeQuery);
      } catch (error: unknown) {
        throw genericInternalError(
          `Error merging staging to target ${endRequestSessionTokenExchangeTable} table: ${error}`
        );
      }
    },

    async deduplicateStaging(): Promise<void> {
      try {
        const deduplicationQuery = generateDeduplicationQuery(
          endRequestSessionTokenExchangeStagingTable,
          "span_id",
          "timestamp"
        );
        await conn.none(deduplicationQuery);
      } catch (error: unknown) {
        throw genericInternalError(
          `Error deduplicating staging ${endRequestSessionTokenExchangeStagingTable} table: ${error}`
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
