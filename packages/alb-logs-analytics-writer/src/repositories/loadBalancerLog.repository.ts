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
          trace_id: (record) => record.trace_id,
          type: (record) => record.type,
          time: (record) => record.time,
          elb: (record) => record.elb,
          client: (record) => record.client,
          target: (record) => record.target,
          request_processing_time: (record) => record.request_creation_time,
          target_processing_time: (record) => record.target_processing_time,
          response_processing_time: (record) => record.response_processing_time,
          elb_status_code: (record) => record.elb_status_code,
          target_status_code: (record) => record.target_status_code,
          received_bytes: (record) => record.received_bytes,
          sent_bytes: (record) => record.sent_bytes,
          request: (record) => record.request,
          user_agent: (record) => record.user_agent,
          ssl_cipher: (record) => record.ssl_cipher,
          ssl_protocol: (record) => record.ssl_protocol,
          target_group_arn: (record) => record.target_group_arn,
          domain_name: (record) => record.domain_name,
          chosen_cert_arn: (record) => record.chosen_cert_arn,
          matched_rule_priority: (record) => record.matched_rule_priority,
          request_creation_time: (record) => record.request_creation_time,
          actions_executed: (record) => record.actions_executed,
          redirect_url: (record) => record.redirect_url,
          error_reason: (record) => record.error_reason,
          target_port_list: (record) => record.target_port_list,
          target_status_code_list: (record) => record.target_status_code_list,
          classification: (record) => record.classification,
          classification_reason: (record) => record.classification_reason,
          conn_trace_id: (record) => record.conn_trace_id,
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
          ON target.trace_id = source.trace_id
        WHEN MATCHED THEN
          UPDATE SET
            type = source.type,
            time = source.time,
            elb = source.elb,
            client = source.client,
            target = source.target,
            request_processing_time = source.request_processing_time,
            target_processing_time = source.target_processing_time,
            response_processing_time = source.response_processing_time,
            elb_status_code = source.elb_status_code,
            target_status_code = source.target_status_code,
            received_bytes = source.received_bytes,
            sent_bytes = source.sent_bytes,
            request = source.request,
            user_agent = source.user_agent,
            ssl_cipher = source.ssl_cipher,
            ssl_protocol = source.ssl_protocol,
            target_group_arn = source.target_group_arn,
            domain_name = source.domain_name,
            chosen_cert_arn = source.chosen_cert_arn,
            matched_rule_priority = source.matched_rule_priority,
            request_creation_time = source.request_creation_time,
            actions_executed = source.actions_executed,
            redirect_url = source.redirect_url,
            error_reason = source.error_reason,
            target_port_list = source.target_port_list,
            target_status_code_list = source.target_status_code_list,
            classification = source.classification,
            classification_reason = source.classification_reason,
            conn_trace_id = source.conn_trace_id
        WHEN NOT MATCHED THEN
          INSERT (
            type,
            time,
            elb,
            client,
            target,
            request_processing_time,
            target_processing_time,
            response_processing_time,
            elb_status_code,
            target_status_code,
            received_bytes,
            sent_bytes,
            request,
            user_agent,
            ssl_cipher,
            ssl_protocol,
            target_group_arn,
            trace_id,
            domain_name,
            chosen_cert_arn,
            matched_rule_priority,
            request_creation_time,
            actions_executed,
            redirect_url,
            error_reason,
            target_port_list,
            target_status_code_list,
            classification,
            classification_reason,
            conn_trace_id
          )
          VALUES (
            source.type,
            source.time,
            source.elb,
            source.client,
            source.target,
            source.request_processing_time,
            source.target_processing_time,
            source.response_processing_time,
            source.elb_status_code,
            source.target_status_code,
            source.received_bytes,
            source.sent_bytes,
            source.request,
            source.user_agent,
            source.ssl_cipher,
            source.ssl_protocol,
            source.target_group_arn,
            source.trace_id,
            source.domain_name,
            source.chosen_cert_arn,
            source.matched_rule_priority,
            source.request_creation_time,
            source.actions_executed,
            source.redirect_url,
            source.error_reason,
            source.target_port_list,
            source.target_status_code_list,
            source.classification,
            source.classification_reason,
            source.conn_trace_id
          );        
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
