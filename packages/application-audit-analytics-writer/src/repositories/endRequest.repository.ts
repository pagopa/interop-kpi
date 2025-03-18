/* eslint-disable @typescript-eslint/explicit-function-return-type */
import {
  DBConnection,
  IMain,
  buildColumnSet,
} from "pagopa-interop-kpi-commons";
import {
  ApplicationAuditEndRequest,
  ApplicationDbTable,
  genericInternalError,
} from "pagopa-interop-kpi-models";
import { config } from "../config/config.js";
import { ApplicationAuditEndRequestMapping } from "../model/db.js";

export function endRequestRepository(conn: DBConnection, pgp: IMain) {
  const endRequestTable = ApplicationDbTable.end_request;

  return {
    async batchInsert(events: ApplicationAuditEndRequest[]): Promise<void> {
      try {
        const endRequestMapping: ApplicationAuditEndRequestMapping = {
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
          user_id: (event) => event.userId,
          self_care_id: (event) => event.selfcareId,
          http_response_status: (event) => event.httpResponseStatus,
          execution_time_ms: (event) => event.executionTimeMs,
        };

        const endRequestTableName = `${endRequestTable}${config.mergeTableSuffix}`;

        const endRequestColumnSet = buildColumnSet<ApplicationAuditEndRequest>(
          pgp,
          endRequestMapping,
          endRequestTableName
        );

        await conn.none(pgp.helpers.insert(events, endRequestColumnSet));
      } catch (error: unknown) {
        throw genericInternalError(
          `Error inserting into end_request staging table: ${error}`
        );
      }
    },

    async mergeStagingToTarget(): Promise<void> {
      try {
        await conn.none(`
          MERGE INTO ${config.dbSchemaName}.${endRequestTable} AS target
          USING ${endRequestTable}${config.mergeTableSuffix} AS source
          ON target.correlation_id = source.correlation_id
          WHEN MATCHED THEN
            UPDATE SET
              service              = source.service,
              service_version      = source.service_version,
              endpoint             = source.endpoint,
              http_method          = source.http_method,
              phase                = source.phase,
              requester_ip_address = source.requester_ip_address,
              node_ip              = source.node_ip,
              pod_name             = source.pod_name,
              uptime_seconds       = source.uptime_seconds,
              timestamp            = source.timestamp,
              amazon_trace_id      = source.amazon_trace_id,
              organization_id      = source.organization_id,
              user_id              = source.user_id,
              self_care_id         = source.self_care_id,
              http_response_status = source.http_response_status,
              execution_time_ms    = source.execution_time_ms
          WHEN NOT MATCHED THEN
            INSERT (
              correlation_id,
              service,
              service_version,
              endpoint,
              http_method,
              phase,
              requester_ip_address,
              node_ip,
              pod_name,
              uptime_seconds,
              timestamp,
              amazon_trace_id,
              organization_id,
              user_id,
              self_care_id,
              http_response_status,
              execution_time_ms
            )
            VALUES (
              source.correlation_id,
              source.service,
              source.service_version,
              source.endpoint,
              source.http_method,
              source.phase,
              source.requester_ip_address,
              source.node_ip,
              source.pod_name,
              source.uptime_seconds,
              source.timestamp,
              source.amazon_trace_id,
              source.organization_id,
              source.user_id,
              source.self_care_id,
              source.http_response_status,
              source.execution_time_ms
            );
        `);
      } catch (error: unknown) {
        throw genericInternalError(
          `Error merging staging to target end_request table: ${error}`
        );
      }
    },

    async cleanStaging(): Promise<void> {
      try {
        await conn.none(
          `TRUNCATE TABLE ${endRequestTable}${config.mergeTableSuffix};`
        );
      } catch (error: unknown) {
        throw genericInternalError(
          `Error cleaning staging begin_request table: ${error}`
        );
      }
    },
  };
}

export type EndRequestRepository = ReturnType<typeof endRequestRepository>;
