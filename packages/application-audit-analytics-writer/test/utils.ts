import { setupTestContainersVitest } from "pagopa-interop-kpi-commons-test";
import { afterEach, inject } from "vitest";
import {
  DBContext,
  genericLogger,
  retryConnection,
} from "pagopa-interop-kpi-commons";
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

export const setupDbService = setupDbServiceBuilder(dbContext.conn);
