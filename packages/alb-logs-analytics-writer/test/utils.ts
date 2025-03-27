import { PassThrough } from "stream";
import { createGunzip, createGzip } from "zlib";
import { setupTestContainersVitest } from "pagopa-interop-kpi-commons-test";
import { afterEach, inject } from "vitest";
import {
  DBConnection,
  DBContext,
  genericLogger,
  retryConnection,
  setupDbServiceBuilder,
} from "pagopa-interop-kpi-commons";
import { LoadBalancerLogTable } from "pagopa-interop-kpi-models";
import { dbServiceBuilder } from "../src/services/dbService.js";
import { config } from "../src/config/config.js";
import { transformFileStream } from "../src/utilities/transformFileStream.js";
import { LoadBalancerLog } from "../src/model/load-balancer-log.js";
import { albLogsAuditServiceBuilder } from "../src/services/albLogsAuditService.js";

export const { cleanup, fileManager, postgresDB } =
  await setupTestContainersVitest(
    inject("dbConfig"),
    inject("fileManagerConfig")
  );

afterEach(cleanup);

const connection = await postgresDB.connect();

export const dbContext: DBContext = {
  conn: connection,
  pgp: postgresDB.$config.pgp,
};

await retryConnection(
  postgresDB,
  dbContext,
  config,
  async (db) => {
    await setupDbServiceBuilder(db.conn, config).setupStagingTables([
      LoadBalancerLogTable.logs,
    ]);
  },
  genericLogger
);

export const dbService = dbServiceBuilder(dbContext);

export const setupDbService = setupDbServiceBuilder(dbContext.conn, config);

export const albLogsAuditService = albLogsAuditServiceBuilder(
  dbService,
  fileManager
);

export async function getTablesByName(
  db: DBConnection,
  table: string
): Promise<Array<{ tablename: string }>> {
  const query = `
    SELECT tablename
    FROM pg_catalog.pg_tables
    WHERE schemaname LIKE 'pg_temp%' 
    AND tablename IN ($1:csv);
  `;
  return await db.query<Array<{ tablename: string }>>(query, table);
}

export async function truncateTable(
  db: DBConnection,
  schema: string,
  stagingTableSuffix?: string
): Promise<void> {
  await db.none(
    `TRUNCATE TABLE ${schema}.${LoadBalancerLogTable.logs}${
      stagingTableSuffix ?? ""
    };`
  );
}

export async function getTargetTableCount(
  db: DBConnection,
  table: string
): Promise<number> {
  const query = `SELECT COUNT(*) as count FROM ${config.dbSchemaName}.${table}`;
  const result = await db.one<{ count: string }>(query);
  return Number(result.count);
}

export const createValidGzipStream = (data: string): PassThrough => {
  const passThrough = new PassThrough();
  const gzip = createGzip();
  gzip.pipe(passThrough);
  gzip.write(data);
  gzip.end();
  return passThrough;
};

export const createValidMockLoadBalancerLog = async (
  logEntries: string
): Promise<LoadBalancerLog[]> => {
  const fileStream = createValidGzipStream(logEntries).pipe(createGunzip());
  const parsedFileStream = transformFileStream(fileStream);
  const transformedLogs: LoadBalancerLog[] = [];

  for await (const log of parsedFileStream) {
    // eslint-disable-next-line functional/immutable-data
    transformedLogs.push(log);
  }
  return transformedLogs;
};

export async function getStagingTableCount(
  db: DBConnection,
  table: string
): Promise<number> {
  const query = `SELECT COUNT(*) as count FROM $1:name;`;
  const result = await db.one<{ count: string }>(query, [table]);
  return Number(result.count);
}

export const validLogEntries = [
  `http 2024-03-01T12:00:00Z app/my-loadbalancer/xyz 192.168.1.1:443 10.0.0.1:80 0.000 0.001 0.000 200 200 34 366 "GET http://example.com HTTP/1.1" "Mozilla/5.0" - - arn:aws:elasticloadbalancing:us-east-2:xyz "Root=1-abc" "-" "-" 0 2024-03-01T12:00:00Z "forward" "-" "-" "10.0.0.1:80" "200" "-" "-" "TID-12345"`,
  `http 2024-03-01T12:01:00Z app/my-loadbalancer/xyz 192.168.1.2:443 10.0.0.2:80 0.001 0.002 0.001 200 200 45 400 "POST http://example.com/login HTTP/1.1" "Mozilla/5.0" - - arn:aws:elasticloadbalancing:us-east-2:xyz "Root=1-def" "-" "-" 0 2024-03-01T12:01:00Z "forward" "-" "-" "10.0.0.2:80" "200" "-" "-" "TID-67890"`,
  `http 2024-03-01T12:02:00Z app/my-loadbalancer/xyz 192.168.1.3:443 10.0.0.3:80 0.002 0.003 0.002 404 404 50 450 "GET http://example.com/missing HTTP/1.1" "Mozilla/5.0" - - arn:aws:elasticloadbalancing:us-east-2:xyz "Root=1-ghi" "-" "-" 0 2024-03-01T12:02:00Z "forward" "-" "-" "10.0.0.3:80" "404" "-" "-" "TID-11223"`,
  `http 2024-03-01T12:03:00Z app/my-loadbalancer/xyz 192.168.1.4:443 10.0.0.4:80 0.003 0.004 0.003 500 500 60 500 "POST http://example.com/api HTTP/1.1" "Mozilla/5.0" - - arn:aws:elasticloadbalancing:us-east-2:xyz "Root=1-jkl" "-" "-" 0 2024-03-01T12:03:00Z "forward" "-" "-" "10.0.0.4:80" "500" "-" "-" "TID-33445"`,
  `http 2024-03-01T12:04:00Z app/my-loadbalancer/xyz 192.168.1.5:443 10.0.0.5:80 0.004 0.005 0.004 302 302 30 350 "GET http://example.com/redirect HTTP/1.1" "Mozilla/5.0" - - arn:aws:elasticloadbalancing:us-east-2:xyz "Root=1-mno" "-" "-" 0 2024-03-01T12:04:00Z "forward" "-" "-" "10.0.0.5:80" "302" "-" "-" "TID-55667"`,
].join("\n");

export const invalidEntries = `\
# This is a comment
2024-03-12T10:00:00Z ALB 192.168.0.1:443 200 500 1000 2000 "-" "-" "-" 100 200 "GET http://example.com HTTP/1.1" "Mozilla/5.0" "-" "-" "-" "Root=1-abc" "-" "-" 0 "2024-03-12T10:00:00Z" "forward" "-" "-" "-" "-" "-" "-" "-"
INVALID RECORD HERE
2024-03-12T10:00:00Z ALB 192.168.0.1:443 200 500 1000 2000 "-" "-" "-" 100 200 "GET http://example.com HTTP/1.1" "Mozilla/5.0" "-" "-" "-" "Root=1-def" "-" "-" 0 "2024-03-12T10:00:00Z" "forward" "-" "-" "-" "-" "-" "-" "-"
`;

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
