/* eslint-disable functional/immutable-data */

import { setupTestContainersVitest } from "pagopa-interop-kpi-commons-test";
import {
  ClientId,
  generateId,
  M2MJwtDbTable,
  TenantId,
  UserId,
} from "pagopa-interop-kpi-models";
import { afterEach, inject } from "vitest";
import {
  DBConnection,
  DBContext,
  FileManager,
  formatDateyyyyMMdd,
  formatTimehhmmss,
  genericLogger,
  Logger,
  retryConnection,
  setupDbServiceBuilder,
} from "pagopa-interop-kpi-commons";
import { GeneratedApiTokenAuditDetails } from "../src/model/domain/models.js";
import { jwtAuditServiceBuilder } from "../src/services/jwtAuditService.js";
import { dbServiceBuilder } from "../src/services/dbService.js";
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
      M2MJwtDbTable.generated_token,
      M2MJwtDbTable.client_assertion,
      M2MJwtDbTable.dpop,
    ]);
  },
  genericLogger
);

export const dbService = dbServiceBuilder(dbContext);

export const setupDbService = setupDbServiceBuilder(dbContext.conn, config);

export const jwtAuditService = jwtAuditServiceBuilder(dbService, fileManager);

export function getMockJwtAudits(n: number): GeneratedApiTokenAuditDetails[] {
  return Array.from({ length: n }, () => getMockJwtAudit());
}

export function getMockJwtAuditWithDuplicates(
  records: number,
  duplicates: number
): GeneratedApiTokenAuditDetails[] {
  const audits: GeneratedApiTokenAuditDetails[] = [];

  const baseAudits = getMockJwtAudits(records);
  audits.push(...baseAudits);
  // eslint-disable-next-line functional/no-let
  for (let i = 0; i < duplicates; i++) {
    audits.push(baseAudits[i]);
  }
  return audits;
}

export const getMockJwtAudit = (): GeneratedApiTokenAuditDetails => {
  const correlationId = generateId();
  const clientId = generateId<ClientId>();
  const kid = "kid";
  const typ = "at+jwt";
  const consumerId = generateId<TenantId>();
  const adminId = generateId<UserId>();
  const clientAssertionJti = generateId();
  const timestamp = Date.now();

  return {
    correlationId,
    subject: clientId,
    audience: "pagopa.it",
    algorithm: "RS256",
    clientId,
    keyId: kid,
    typ,
    jwtId: generateId(),
    issuedAt: timestamp,
    issuer: "interop jwt issuer",
    expirationTime: timestamp,
    organizationId: consumerId,
    adminId,
    notBefore: 0,
    cnf: {
      jkt: "...",
    },
    clientAssertion: {
      subject: clientId,
      audience: "interop.pagopa.it/client-assertion",
      algorithm: "RS256",
      keyId: kid,
      jwtId: clientAssertionJti,
      issuedAt: timestamp,
      issuer: consumerId,
      expirationTime: timestamp,
    },
    dpop: {
      typ: "dpop+jwt",
      alg: "ES256",
      jwk: {
        crv: "P-256",
        kty: "EC",
        x: "...",
        y: "...",
      },
      htm: "POST",
      htu: "test/authorization-server/token.oauth2",
      iat: timestamp,
      jti: "...",
    },
    originFileReference: "token-details/date/timestamp_uuid.ndjson",
  };
};

export const writeJwtAuditNdjson = async (
  records: GeneratedApiTokenAuditDetails[],
  fileManager: FileManager,
  logger: Logger
): Promise<{ fullPathName: string }> => {
  const date = new Date();
  const ymdDate = formatDateyyyyMMdd(date);
  const hmsTime = formatTimehhmmss(date);

  const fileName = `${ymdDate}_${hmsTime}_${generateId()}.ndjson`;
  const filePath = `token-details/${ymdDate}`;

  const ndjsonContent = records
    .map((record) => JSON.stringify(record))
    .join("\n");

  await fileManager.storeBytes(
    {
      bucket: config.s3Bucket,
      path: filePath,
      name: fileName,
      content: Buffer.from(ndjsonContent),
    },
    logger
  );

  return { fullPathName: `${filePath}/${fileName}` };
};

export const sqsMessagesMock = {
  validMessage: {
    Records: [
      {
        s3: {
          object: {
            key: "jwt-audit.ndjson",
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
  stagingTableSuffix?: string
): Promise<void> {
  const truncateDPoP = `${schema}.${M2MJwtDbTable.dpop}${
    stagingTableSuffix ?? ""
  }`;
  const truncateClientAssertion = `${schema}.${M2MJwtDbTable.client_assertion}${
    stagingTableSuffix ?? ""
  }`;
  const truncateGeneratedToken = `${schema}.${M2MJwtDbTable.generated_token}${
    stagingTableSuffix ?? ""
  }`;
  await db.none(
    `TRUNCATE TABLE ${truncateGeneratedToken},  ${truncateClientAssertion}, ${truncateDPoP};`
  );
}

export async function cleanBucket(bucket: string): Promise<void> {
  const files = await fileManager.listFiles(bucket, genericLogger);
  for (const file of files) {
    await fileManager.delete(bucket, file, genericLogger);
  }
}
