/* eslint-disable @typescript-eslint/explicit-function-return-type */
import {
  DBConnection,
  IMain,
  buildColumnSet,
  generateMergeQuery,
} from "pagopa-interop-kpi-commons";
import {
  LoadBalancerLogTable,
  genericInternalError,
} from "pagopa-interop-kpi-models";
import { config } from "../config/config.js";
import { LoadBalancerLog } from "../model/load-balancer-log.js";
import { LoadBalancerLogMapping, LoadBalancerLogSchema } from "../model/db.js";

export function loadBalancerLogRepository(conn: DBConnection) {
  const loadBalancerTable = LoadBalancerLogTable.logs;
  const loadBalancerStagingTable = `${loadBalancerTable}${config.mergeTableSuffix}`;

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

        const logColumnSet = buildColumnSet<LoadBalancerLog>(
          pgp,
          logMapping,
          loadBalancerStagingTable
        );
        await conn.none(pgp.helpers.insert(records, logColumnSet));
      } catch (error: unknown) {
        throw genericInternalError(
          `Error inserting into ${loadBalancerStagingTable} staging table: ${error}`
        );
      }
    },

    async merge(): Promise<void> {
      try {
        const clientAssertionMergeQuery = generateMergeQuery(
          LoadBalancerLogSchema,
          config.dbSchemaName,
          loadBalancerTable,
          config.mergeTableSuffix,
          "trace_id"
        );
        await conn.none(clientAssertionMergeQuery);
      } catch (error: unknown) {
        throw genericInternalError(
          `Error merging staging to target ${loadBalancerTable} table: ${error}`
        );
      }
    },

    async clean(): Promise<void> {
      try {
        await conn.none(`TRUNCATE TABLE ${loadBalancerStagingTable};`);
      } catch (error: unknown) {
        throw genericInternalError(
          `Error cleaning staging ${loadBalancerStagingTable} table: ${error}`
        );
      }
    },
  };
}

export type LoadBalancerLogRepository = ReturnType<
  typeof loadBalancerLogRepository
>;
