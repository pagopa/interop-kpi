/* eslint-disable max-params */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable functional/no-let */
/* eslint-disable functional/immutable-data */

import {
  DB,
  DbConfig,
  FileManager,
  FileManagerConfig,
  LoggerConfig,
  S3Config,
  genericLogger,
  initDB,
  initFileManager,
} from "pagopa-interop-kpi-commons";

/**
 * This function is a setup for vitest that initializes the file manager and returns its instance along with a cleanup function.
 * The cleanup function deletes all the data from the file manager storage and must be called at the end of each test (`afterEach`),
 * to ensure that the tests are isolated.
 *
 * @param fileManagerConfig The configuration object containing the connection parameters.
 * It must be retrieved from the `config` object provided by the `setupTestContainersVitestGlobal` function with Vitest's `inject` function.
 *
 * @example
 * ```typescript
 * import { setupTestContainersVitest } from "pagopa-interop-commons-test";
 * import { inject, afterEach } from "vitest";
 *
 * export const { fileManager, cleanup } = setupTestContainersVitest(inject("config"));
 *
 * afterEach(cleanup);
 * ```
 */
export function setupTestContainersVitest(
  dbConfig?: DbConfig,
  fileManagerConfig?: FileManagerConfig & S3Config & LoggerConfig
): Promise<{
  postgresDB: DB;
  fileManager: FileManager;
  cleanup: () => Promise<void>;
}>;

export async function setupTestContainersVitest(
  dbConfig?: DbConfig,
  fileManagerConfig?: FileManagerConfig & S3Config & LoggerConfig
): Promise<{
  postgresDB?: DB;
  fileManager?: FileManager;
  cleanup: () => Promise<void>;
}> {
  let postgresDB: DB | undefined;
  let fileManager: FileManager | undefined;
  const s3OriginalBucket = fileManagerConfig?.s3Bucket;

  if (fileManagerConfig) {
    fileManager = initFileManager(fileManagerConfig);
  }

  if (dbConfig) {
    postgresDB = initDB({
      username: dbConfig.dbUsername,
      password: dbConfig.dbPassword,
      host: dbConfig.dbHost,
      port: dbConfig.dbPort,
      database: dbConfig.dbName,
      useSSL: dbConfig.dbUseSSL,
      maxConnectionPool: dbConfig.dbMaxConnectionPool,
    });
  }

  return {
    postgresDB,
    fileManager,
    cleanup: async (): Promise<void> => {
      if (s3OriginalBucket && fileManagerConfig && fileManager) {
        const files = await fileManager.listFiles(
          s3OriginalBucket,
          genericLogger
        );
        await Promise.all(
          files.map(async (file) => {
            await fileManager?.delete(s3OriginalBucket, file, genericLogger);
          })
        );

        // Reset bucket name if changed during tests
        fileManagerConfig.s3Bucket = s3OriginalBucket;
      }
    },
  };
}
