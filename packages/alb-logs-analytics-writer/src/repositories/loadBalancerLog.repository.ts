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
          trace_id: (record) => record.traceId,
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
          domain_name: (record) => record.domainName,
          chosen_cert_arn: (record) => record.chosenCertArn,
          matched_rule_priority: (record) => record.matchedRulePriority,
          request_creation_time: (record) => record.requestCreationTime,
          actions_executed: (record) => record.actionsExecuted,
          redirect_url: (record) => record.redirectUrl,
          error_reason: (record) => record.errorReason,
          target_port_list: (record) => JSON.stringify(record.targetPortList),
          target_status_code_list: (record) =>
            JSON.stringify(record.targetStatusCode),
          classification: (record) => record.classification,
          classification_reason: (record) => record.classificationReason,
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
        // Insert the records with all required fields mapped
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
              client_ip = source.client_ip,
              client_port = source.client_port,
              target_ip = source.target_ip,
              target_port = source.target_port,
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
              classification_reason = source.classification_reason
              WHEN NOT MATCHED THEN
              INSERT (
                type,
                time,
                elb,
                client_ip,
                client_port,
                target_ip,
                target_port,
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
                classification_reason
              )
              VALUES (
                source.type,
                source.time,
                source.elb,
                source.client_ip,
                source.client_port,
                source.target_ip,
                source.target_port,
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
                source.classification_reason
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
