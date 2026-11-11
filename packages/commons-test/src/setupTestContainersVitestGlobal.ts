/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable functional/immutable-data */
/* eslint-disable functional/no-let */

import { config as dotenv } from "dotenv-flow";
import {
  DbConfig,
  FileManagerConfig,
  LoggerConfig,
  S3Config,
} from "pagopa-interop-kpi-commons";
import { StartedTestContainer } from "testcontainers";
import type {} from "vitest";
import type { GlobalSetupContext } from "vitest/node";
import {
  TEST_RUSTFS_PORT,
  TEST_POSTGRES_DB_PORT,
  createS3Buckets,
  postgreSQLContainer,
  rustfsContainer,
} from "./containerTestUtils.js";

declare module "vitest" {
  export interface ProvidedContext {
    dbConfig?: DbConfig;
    fileManagerConfig?: FileManagerConfig & LoggerConfig & S3Config;
  }
}

/**
 * This function is a global setup for vitest that starts and stops the RustFS container (FileManager).
 * It provides the `fileManagerConfig` object to the tests.
 *
 * @see https://vitest.dev/config/#globalsetup
 */
export function setupTestContainersVitestGlobal() {
  dotenv();
  const dbConfig = DbConfig.safeParse(process.env);
  const fileManagerConfig = FileManagerConfig.and(S3Config)
    .and(LoggerConfig)
    .safeParse(process.env);

  return async function ({
    provide,
  }: GlobalSetupContext): Promise<() => Promise<void>> {
    let startedPostgreSqlContainer: StartedTestContainer | undefined;
    let startedRustfsContainer: StartedTestContainer | undefined;

    if (dbConfig.success) {
      startedPostgreSqlContainer = await postgreSQLContainer(
        dbConfig.data
      ).start();

      /**
       * Since testcontainers exposes to the host on a random port, in order to avoid port
       * collisions, we need to get the port through `getMappedPort` to connect to the databases.
       *
       * @see https://node.testcontainers.org/features/containers/#exposing-container-ports
       *
       * The comment applies to the other containers setup after this one as well.
       */
      dbConfig.data.dbPort = startedPostgreSqlContainer.getMappedPort(
        TEST_POSTGRES_DB_PORT
      );

      /**
       * Vitest global setup functions are executed in a separate process, vitest provides a way to
       * pass serializable data to the tests via the `provide` function.
       * In this case, we provide the `config` object to the tests, so that they can connect to the
       * started containers.
       *
       * The comment applies to the other containers setup after this one as well.
       */
      provide("dbConfig", dbConfig.data);
    }

    // Setting up the RustFS container if the config is provided
    if (fileManagerConfig.success && fileManagerConfig.data.s3CustomServer) {
      startedRustfsContainer = await rustfsContainer().start();

      fileManagerConfig.data.s3ServerPort =
        startedRustfsContainer.getMappedPort(TEST_RUSTFS_PORT);

      await createS3Buckets(fileManagerConfig.data, [
        fileManagerConfig.data.s3Bucket,
        "test-bucket-1",
        "test-bucket-2",
      ]);

      provide("fileManagerConfig", fileManagerConfig.data);
    }

    return async (): Promise<void> => {
      await startedPostgreSqlContainer?.stop();
      await startedRustfsContainer?.stop();
    };
  };
}
