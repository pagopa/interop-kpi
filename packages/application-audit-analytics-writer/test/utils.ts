import { setupTestContainersVitest } from "pagopa-interop-kpi-commons-test";
import { afterEach, inject } from "vitest";
import {
  DBConnection,
  DBContext,
  genericLogger,
  retryConnection,
  setupDbServiceBuilder,
} from "pagopa-interop-kpi-commons";
import {
  ApplicationAuditEvent,
  ApplicationAuditPhase,
  ApplicationDbTable,
  CorrelationId,
  SpanId,
  applicationAuditEndppoint,
  applicationAuditPhase,
  applicationAuditService,
  generateId,
} from "pagopa-interop-kpi-models";
import { match } from "ts-pattern";
import { KafkaMessage } from "kafkajs";
import { config } from "../src/config/config.js";

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
      ApplicationDbTable.begin_request,
      ApplicationDbTable.end_request,
      ApplicationDbTable.end_request_session_token_exchange,
      ApplicationDbTable.end_request_auth_server,
    ]);
  },
  genericLogger
);

export const setupDbService = setupDbServiceBuilder(dbContext.conn, config);

export function mockEventsToKafkaMessages(
  events: ApplicationAuditEvent[]
): KafkaMessage[] {
  return events.map((message) => ({
    value: Buffer.from(JSON.stringify(message)),
  })) as unknown as KafkaMessage[];
}

export function getMockApplicationAudits<T>(
  beginCount: number,
  endCount: number,
  endSessionTokenExchangeCount: number,
  endAuthServcerCount: number
): T[] {
  const createEvent = (
    phase: ApplicationAuditPhase,
    additionalAudit = {},
    service = "mockService",
    endpoint = "/mock-endpoint"
  ): T => {
    const common = {
      spanId: generateId<SpanId>(),
      correlationId: generateId<CorrelationId>(),
      service,
      serviceVersion: "1.0",
      endpoint,
      httpMethod: "GET",
      requesterIpAddress: "192.168.1.100",
      nodeIp: "127.0.0.1",
      podName: "mock-pod",
      uptimeSeconds: 100,
      timestamp: Date.now(),
      amazonTraceId: generateId(),
    } as T;

    return match(phase)
      .with("BEGIN_REQUEST", () => ({
        ...common,
        phase: applicationAuditPhase.BEGIN_REQUEST,
      }))
      .with("END_REQUEST", () => ({
        ...common,
        ...additionalAudit,
        phase: applicationAuditPhase.END_REQUEST,
        httpResponseStatus: 200,
        executionTimeMs: 50,
      }))
      .exhaustive() as T;
  };

  const beginEvents = Array.from({ length: beginCount }, () =>
    createEvent(applicationAuditPhase.BEGIN_REQUEST)
  );
  const endEvents = Array.from({ length: endCount }, () =>
    createEvent(applicationAuditPhase.END_REQUEST, {
      userId: generateId(),
    })
  );
  const endSessionTokenExchangeEvents = Array.from(
    { length: endSessionTokenExchangeCount },
    () =>
      createEvent(
        applicationAuditPhase.END_REQUEST,
        {
          selfcareId: generateId(),
        },
        applicationAuditService.BFF,
        applicationAuditEndppoint.SESSION_TOKENS
      )
  );
  const endAuthServerEvents = Array.from({ length: endAuthServcerCount }, () =>
    createEvent(
      applicationAuditPhase.END_REQUEST,
      {
        clientId: generateId(),
      },
      applicationAuditService.AUDIT_SERVER
    )
  );

  return [
    ...beginEvents,
    ...endEvents,
    ...endSessionTokenExchangeEvents,
    ...endAuthServerEvents,
  ];
}

export async function getTablesByName(
  db: DBConnection,
  tables: string[]
): Promise<Array<{ tablename: string }>> {
  const query = `
    SELECT tablename
    FROM pg_catalog.pg_tables
    WHERE schemaname LIKE 'pg_temp%' 
    AND tablename IN ($1:csv);
  `;

  return await db.query<Array<{ tablename: string }>>(query, [tables]);
}

export async function getStagingTableCount(
  db: DBConnection,
  table: string
): Promise<number> {
  const query = `SELECT COUNT(*) as count FROM $1:name;`;
  const result = await db.one<{ count: string }>(query, [table]);
  return Number(result.count);
}

export async function getTargetTableCount(
  db: DBConnection,
  table: string
): Promise<number> {
  const query = `SELECT COUNT(*) as count FROM $1:name.$2:name;`;
  const result = await db.one<{ count: string }>(query, [
    config.dbSchemaName,
    [table],
  ]);
  return Number(result.count);
}

export async function truncateTables(
  db: DBConnection,
  schema: string,
  tables: string[]
): Promise<void> {
  for (const table of tables) {
    await db.none(`TRUNCATE TABLE ${schema}.${table};`);
  }
}
