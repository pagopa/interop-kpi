/* eslint-disable @typescript-eslint/explicit-function-return-type */
import {
  DBConnection,
  IMain,
  buildColumnSet,
} from "pagopa-interop-kpi-commons";
import {
  ApplicationAuditBeginRequest,
  ApplicationDbTable,
  genericInternalError,
} from "pagopa-interop-kpi-models";
import { config } from "../config/config.js";
import { ApplicationAuditBeginRequestMapping } from "../model/db.js";

export function beginRequestRepository(conn: DBConnection, pgp: IMain) {
  const beginRequestTable = ApplicationDbTable.begin_request;

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

        const beginRequestTableName = `${beginRequestTable}${config.mergeTableSuffix}`;

        const beginRequestColumnSet =
          buildColumnSet<ApplicationAuditBeginRequest>(
            pgp,
            beginRequestMapping,
            beginRequestTableName
          );

        await conn.none(pgp.helpers.insert(events, beginRequestColumnSet));
      } catch (error: unknown) {
        throw genericInternalError(
          `Error inserting into begin_request staging table: ${error}`
        );
      }
    },

    async mergeStagingToTarget(): Promise<void> {
      try {
        await conn.none(`
          MERGE INTO ${config.dbSchemaName}.${beginRequestTable} 
          USING ${beginRequestTable}${config.mergeTableSuffix} AS source
          ON ${config.dbSchemaName}.${beginRequestTable}.correlation_id = source.correlation_id
          WHEN MATCHED THEN
            UPDATE SET
              service             = source.service,
              service_version     = source.service_version,
              endpoint            = source.endpoint,
              http_method         = source.http_method,
              phase               = source.phase,
              requester_ip_address= source.requester_ip_address,
              node_ip             = source.node_ip,
              pod_name            = source.pod_name,
              uptime_seconds      = source.uptime_seconds,
              timestamp           = source.timestamp,
              amazon_trace_id     = source.amazon_trace_id
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
              amazon_trace_id
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
              source.amazon_trace_id
            );
        `);
      } catch (error: unknown) {
        throw genericInternalError(
          `Error merging staging to target begin_request table: ${error}`
        );
      }
    },

    async cleanStaging(): Promise<void> {
      try {
        await conn.none(
          `TRUNCATE TABLE ${beginRequestTable}${config.mergeTableSuffix};`
        );
      } catch (error: unknown) {
        throw genericInternalError(
          `Error cleaning staging begin_request table: ${error}`
        );
      }
    },
  };
}

export type BeginRequestRepository = ReturnType<typeof beginRequestRepository>;
