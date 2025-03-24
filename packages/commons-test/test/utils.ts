/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { inject, afterEach } from "vitest";
import {
  DBContext,
  DBConnection,
  setupDbServiceBuilder,
} from "pagopa-interop-kpi-commons";
import { setupTestContainersVitest } from "../src/index.js";
export const config = {
  mergeTableSuffix: "_staging",
  dbSchemaName: "infra",
};

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

export const setupDbService = (conn: DBConnection) =>
  setupDbServiceBuilder(conn, config);

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

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const s3Bucket = inject("fileManagerConfig")!.s3Bucket;
