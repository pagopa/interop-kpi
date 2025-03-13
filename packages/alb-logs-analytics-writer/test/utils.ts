import { setupTestContainersVitest } from "pagopa-interop-kpi-commons-test";
import { afterEach, inject } from "vitest";
import { LoadBalancerLog } from "../src/model/load-balancer-log.js";
import { DBConnection, DBContext } from "pagopa-interop-kpi-commons";
import { generateId } from "pagopa-interop-kpi-models";

export const { cleanup, fileManager, postgresDB } =
  await setupTestContainersVitest(
    inject("dbConfig"),
    inject("fileManagerConfig")
  );

afterEach(cleanup);

export const getMockAuditMessage = (): LoadBalancerLog => ({
  type: "http",
  time: new Date().toISOString(),
  elb: "mock-elb",
  client: "192.168.1.1",
  target: "192.168.1.2",
  request_processing_time: "0.001",
  target_processing_time: "0.002",
  response_processing_time: "0.003",
  elb_status_code: "200",
  target_status_code: "200",
  received_bytes: "512",
  sent_bytes: "1024",
  request: "GET https://mock-url.com HTTP/1.1",
  user_agent: "MockUserAgent",
  ssl_cipher: "TLS_AES_128_GCM_SHA256",
  ssl_protocol: "TLSv1.3",
  target_group_arn: "mock-target-group-arn",
  trace_id: generateId(),
  domain_name: "mock-domain.com",
  chosen_cert_arn: "mock-cert-arn",
  matched_rule_priority: "1",
  request_creation_time: new Date().toISOString(),
  actions_executed: "mock-action",
  redirect_url: "https://mock-redirect.com",
  error_reason: "None",
  target_port_list: "443",
  target_status_code_list: "200",
  classification: "success",
  classification_reason: "Valid request",
  conn_trace_id: generateId(),
});

export const sqsMessagesMock = {
  validMessage: {
    Records: [
      {
        s3: {
          object: {
            key: "alb-logs.gz",
          },
        },
      },
    ],
  },
  emptyS3KeyMessage: {
    Records: [
      {
        s3: {
          object: {
            key: "",
          },
        },
      },
    ],
  },
  emptyS3RecordsMessage: {
    Records: [],
  },
} as const;
const connection = await postgresDB.connect();

export const dbContext: DBContext = {
  conn: connection,
  pgp: postgresDB.$config.pgp,
};

export async function getTablesByName(
  db: DBConnection,
  table: string
): Promise<{ tablename: string }[]> {
  const query = `
    SELECT tablename
    FROM pg_catalog.pg_tables
    WHERE schemaname LIKE 'pg_temp%' 
    AND tablename IN ($1:csv);
  `;
  const result = await db.query<{ tablename: string }[]>(query, table);
  return result;
}
