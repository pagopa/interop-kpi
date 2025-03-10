/* eslint-disable functional/no-let, functional/immutable-data, @typescript-eslint/await-thenable */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import {
  DB,
  DbConfig,
  DBContext,
  genericLogger,
  initDB,
  retryConnection,
} from "pagopa-interop-kpi-commons";
import { StartedTestContainer } from "testcontainers";
import {
  postgreSQLContainer,
  TEST_POSTGRES_DB_PORT,
} from "../src/containerTestUtils.js";

describe("DB Connection", () => {
  let startedPostgreSqlContainer: StartedTestContainer;
  let postgresDB: DB;
  let dbConfig: DbConfig;

  const createDBInstance = async (): Promise<DB> => {
    const config = DbConfig.safeParse(process.env);
    if (!config.success) {
      throw new Error(`DbConfig test parsing failed. ${config.error}`);
    }
    dbConfig = config.data;
    startedPostgreSqlContainer = await postgreSQLContainer(config.data).start();
    config.data.dbPort = startedPostgreSqlContainer.getMappedPort(
      TEST_POSTGRES_DB_PORT
    );

    return initDB({
      username: config.data.dbUsername,
      password: config.data.dbPassword,
      host: config.data.dbHost,
      port: config.data.dbPort,
      database: config.data.dbName,
      useSSL: config.data.dbUseSSL,
      maxConnectionPool: config.data.dbMaxConnectionPool,
    });
  };

  beforeAll(async () => {
    postgresDB = await createDBInstance();
  });

  afterAll(async () => {
    if (startedPostgreSqlContainer) {
      await startedPostgreSqlContainer.stop();
    }
  });

  it("should trigger retry logic when connection fail", async () => {
    const dbContext: DBContext = {
      conn: await postgresDB.connect(),
      pgp: postgresDB.$config.pgp,
    };

    const warnSpy = vi.spyOn(genericLogger, "warn");

    const runFn = vi.fn(async (ctx: DBContext) => {
      const checkConnection = await ctx.conn.query("SELECT 1 as result");
      expect(checkConnection[0].result).toBe(1);
    });

    await retryConnection(
      postgresDB,
      dbContext,
      dbConfig,
      runFn,
      genericLogger
    );

    await startedPostgreSqlContainer.stop();

    await new Promise((resolve) => setTimeout(resolve, 4000));

    await expect(runFn).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Attempt"));
  });
});
