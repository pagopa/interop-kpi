import { setupTestContainersVitest } from "pagopa-interop-kpi-commons-test";
import {
  AgreementId,
  ClientId,
  DescriptorId,
  EServiceId,
  generateId,
  JwtDbTable,
  PurposeId,
  PurposeVersionId,
  TenantId,
} from "pagopa-interop-kpi-models";
import { afterEach, inject } from "vitest";
import {
  dateToSeconds,
  DBConnection,
  DBContext,
  FileManager,
  formatDateyyyyMMdd,
  formatTimehhmmss,
  genericLogger,
  Logger,
  retryConnection,
} from "pagopa-interop-kpi-commons";
import { GeneratedTokenAuditDetails } from "../src/model/domain/models.js";
import { jwtAuditServiceBuilder } from "../src/services/jwtAuditService.js";
import { dbServiceBuilder } from "../src/services/dbService.js";
import { setupDbServiceBuilder } from "../src/services/setupDbService.js";
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
    await setupDbServiceBuilder(db.conn).setupStagingTables();
  },
  genericLogger
);

export const dbService = dbServiceBuilder(dbContext);

export const setupDbService = setupDbServiceBuilder(dbContext.conn);

export const jwtAuditService = jwtAuditServiceBuilder(dbService, fileManager);

export function getMockJwtAudits(n: number): GeneratedTokenAuditDetails[] {
  return Array.from({ length: n }, () => getMockJwtAudit());
}

export const getMockJwtAudit = (): GeneratedTokenAuditDetails => {
  const correlationId = generateId();
  const eserviceId = generateId<EServiceId>();
  const descriptorId = generateId<DescriptorId>();
  const agreementId = generateId<AgreementId>();
  const clientId = generateId<ClientId>();
  const purposeId = generateId<PurposeId>();
  const kid = "kid";
  const purposeVersionId = generateId<PurposeVersionId>();
  const consumerId = generateId<TenantId>();
  const clientAssertionJti = generateId();

  return {
    correlationId,
    eserviceId,
    descriptorId,
    agreementId,
    subject: clientId,
    audience: "pagopa.it",
    purposeId,
    algorithm: "RS256",
    clientId,
    keyId: kid,
    purposeVersionId,
    jwtId: generateId(),
    issuedAt: dateToSeconds(new Date()),
    issuer: "interop jwt issuer",
    expirationTime: dateToSeconds(new Date()),
    organizationId: consumerId,
    notBefore: 0,
    clientAssertion: {
      subject: clientId,
      audience: "pagopa.it",
      algorithm: "RS256",
      keyId: kid,
      jwtId: clientAssertionJti,
      issuedAt: dateToSeconds(new Date()),
      issuer: consumerId,
      expirationTime: dateToSeconds(new Date()),
    },
  };
};

export const writeJwtAuditNdjson = async (
  records: GeneratedTokenAuditDetails[],
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
  await db.none(
    `TRUNCATE TABLE ${schema}.${JwtDbTable.client_assertion}${
      stagingTableSuffix ?? ""
    } CASCADE;`
  );
  await db.none(
    `TRUNCATE TABLE ${schema}.${JwtDbTable.generated_token}${
      stagingTableSuffix ?? ""
    };`
  );
}
