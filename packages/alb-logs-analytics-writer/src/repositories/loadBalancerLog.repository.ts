/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { IMain, ITask, buildColumnSet } from "pagopa-interop-kpi-commons";
import { genericInternalError } from "pagopa-interop-kpi-models";
import { config } from "../config/config.js";
import { LoadBalancerLog } from "../model/load-balancer-log.js";
import { LoadBalancerLogMapping, LoadBalancerLogTable } from "../model/db.js";

export function loadBalancerLogRepository(t: ITask<unknown>) {
  const loadBalancerTable = LoadBalancerLogTable.logs;

  return {
    async insert(pgp: IMain, records: LoadBalancerLog[]): Promise<void> {
      try {
        const logMapping: LoadBalancerLogMapping = {
          type: (record) => record.type,
          time: (record) => new Date(record.time),
          elb: (record) => record.elb,
          client_ip: (record) => record.clientIp,
          client_port: (record) => record.clientPort,
          target_ip: (record) => record.targetIp,
          target_port: (record) => record.targetPort,
          request_processing_time: (record) => record.requestProcessingTime,
          target_processing_time: (record) => record.targetProcessingTime,
          response_processing_time: (record) => record.responseProcessingTime,
          elb_status_code: (record) => record.elbStatusCode,
          target_status_code: (record) => record.targetStatusCode,
          received_bytes: (record) => record.receivedBytes,
          sent_bytes: (record) => record.sentBytes,
          request: (record) => record.request,
          user_agent: (record) => record.userAgent,
          ssl_cipher: (record) => record.sslCipher,
          ssl_protocol: (record) => record.sslProtocol,
        };

        const logTableName = `${loadBalancerTable}${config.mergeTableSuffix}`;
        const logColumnSet = buildColumnSet<LoadBalancerLog>(
          pgp,
          logMapping,
          logTableName,
          config.dbSchemaName
        );

        await t.none(pgp.helpers.insert(records, logColumnSet));
      } catch (error: unknown) {
        throw genericInternalError(
          `Error inserting into load_balancer_logs staging table: ${error}`
        );
      }
    },

    async merge(): Promise<void> {
      try {
        await t.none(`
          MERGE INTO ${config.dbSchemaName}.${loadBalancerTable} AS target 
          USING ${config.dbSchemaName}.${loadBalancerTable}${config.mergeTableSuffix} AS source
            ON target.time = source.time AND target.elb = source.elb
          WHEN MATCHED THEN
            UPDATE SET client_ip = source.client_ip, client_port = source.client_port, 
                        target_ip = source.target_ip, target_port = source.target_port, 
                        request_processing_time = source.request_processing_time, 
                        target_processing_time = source.target_processing_time, 
                        response_processing_time = source.response_processing_time, 
                        elb_status_code = source.elb_status_code, 
                        target_status_code = source.target_status_code, 
                        received_bytes = source.received_bytes, 
                        sent_bytes = source.sent_bytes, request = source.request, 
                        user_agent = source.user_agent, ssl_cipher = source.ssl_cipher, 
                        ssl_protocol = source.ssl_protocol
          WHEN NOT MATCHED THEN
            INSERT INTO ${config.dbSchemaName}.${loadBalancerTable} 
              SELECT * FROM ${config.dbSchemaName}.${loadBalancerTable}${config.mergeTableSuffix};
        `);
      } catch (error: unknown) {
        throw genericInternalError(
          `Error merging staging to target load_balancer_logs table: ${error}`
        );
      }
    },

    async clean(): Promise<void> {
      try {
        await t.none(
          `TRUNCATE TABLE ${config.dbSchemaName}.${loadBalancerTable}${config.mergeTableSuffix};`
        );
      } catch (error: unknown) {
        throw genericInternalError(
          `Error cleaning staging load_balancer_logs table: ${error}`
        );
      }
    },
  };
}

export type LoadBalancerLogRepository = ReturnType<
  typeof loadBalancerLogRepository
>;
