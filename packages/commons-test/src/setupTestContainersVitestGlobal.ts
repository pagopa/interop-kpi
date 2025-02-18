/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable functional/immutable-data */
/* eslint-disable functional/no-let */

import { config as dotenv } from "dotenv-flow";
import {
  FileManagerConfig,
  LoggerConfig,
  S3Config,
} from "pagopa-interop-kpi-commons";
import { StartedTestContainer } from "testcontainers";
import type {} from "vitest";
import type { GlobalSetupContext } from "vitest/node";
import { TEST_MINIO_PORT, minioContainer } from "./containerTestUtils.js";

declare module "vitest" {
  export interface ProvidedContext {
    fileManagerConfig?: FileManagerConfig & LoggerConfig & S3Config;
  }
}

/**
 * This function is a global setup for vitest that starts and stops the Minio container (FileManager).
 * It provides the `fileManagerConfig` object to the tests.
 *
 * @see https://vitest.dev/config/#globalsetup
 */
export function setupTestContainersVitestGlobal() {
  dotenv();
  const fileManagerConfig = FileManagerConfig.and(S3Config)
    .and(LoggerConfig)
    .safeParse(process.env);

  return async function ({
    provide,
  }: GlobalSetupContext): Promise<() => Promise<void>> {
    let startedMinioContainer: StartedTestContainer | undefined;

    // Setting up the Minio container if the config is provided
    if (fileManagerConfig.success) {
      startedMinioContainer = await minioContainer(
        fileManagerConfig.data
      ).start();

      fileManagerConfig.data.s3ServerPort =
        startedMinioContainer.getMappedPort(TEST_MINIO_PORT);

      provide("fileManagerConfig", fileManagerConfig.data);
    }

    return async (): Promise<void> => {
      await startedMinioContainer?.stop();
    };
  };
}
