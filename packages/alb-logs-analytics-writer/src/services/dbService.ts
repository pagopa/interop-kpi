import { DB } from "pagopa-interop-kpi-commons";
import { config } from "../config/config.js";
import { LoadBalancerLog } from "../model/load-balancer-log.js";
import { insertStagingRecordsError, mergeDataError } from "../model/errors.js";

export function dbServiceBuilder(db: DB) {
  return {
    async insertStagingRecords(records: LoadBalancerLog[]): Promise<void> {
      try {
        await db.tx(async (t) => {
          const pgp = db.$config.pgp;

          const logMappings = [
            { name: "type", property: "type" },
            { name: "time", property: "time" },
            { name: "elb", property: "elb" },
            { name: "client_ip", property: "clientIp" },
            { name: "client_port", property: "clientPort" },
            { name: "target_ip", property: "targetIp" },
            { name: "target_port", property: "targetPort" },
            {
              name: "request_processing_time",
              property: "requestProcessingTime",
            },
            {
              name: "target_processing_time",
              property: "targetProcessingTime",
            },
            {
              name: "response_processing_time",
              property: "responseProcessingTime",
            },
            { name: "elb_status_code", property: "elbStatusCode" },
            { name: "target_status_code", property: "targetStatusCode" },
            { name: "received_bytes", property: "receivedBytes" },
            { name: "sent_bytes", property: "sentBytes" },
            { name: "request", property: "request" },
            { name: "user_agent", property: "userAgent" },
            { name: "ssl_cipher", property: "sslCipher" },
            { name: "ssl_protocol", property: "sslProtocol" },
          ];

          const logColumnSet = new pgp.helpers.ColumnSet(logMappings, {
            table: `${config.dbSchemaName}.staging_load_balancer_logs`,
          });

          await t.none(pgp.helpers.insert(records, logColumnSet));
        });
      } catch (error: unknown) {
        throw insertStagingRecordsError(error);
      }
    },

    async mergeData(): Promise<void> {
      try {
        await db.tx(async (t) => {
          await t.none(`
            MERGE INTO ${config.dbSchemaName}.load_balancer_logs AS target
            USING ${config.dbSchemaName}.staging_load_balancer_logs AS source
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
              INSERT INTO ${config.dbSchemaName}.load_balancer_logs 
                SELECT * FROM ${config.dbSchemaName}.staging_load_balancer_logs;
          `);

          await t.none(
            `TRUNCATE TABLE ${config.dbSchemaName}.staging_load_balancer_logs;`
          );
        });
      } catch (error: unknown) {
        throw mergeDataError(error);
      }
    },
  };
}

export type DBService = ReturnType<typeof dbServiceBuilder>;
