/* eslint-disable max-params */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable functional/no-let */
/* eslint-disable functional/immutable-data */

import {
  FileManager,
  FileManagerConfig,
  LoggerConfig,
  S3Config,
  genericLogger,
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
  fileManagerConfig?: FileManagerConfig & S3Config & LoggerConfig
): Promise<{
  fileManager: FileManager;
  cleanup: () => Promise<void>;
}>;

export async function setupTestContainersVitest(
  fileManagerConfig?: FileManagerConfig & S3Config & LoggerConfig
): Promise<{
  fileManager?: FileManager;
  cleanup: () => Promise<void>;
}> {
  const s3OriginalBucket = fileManagerConfig?.s3Bucket;
  let fileManager: FileManager | undefined;

  if (fileManagerConfig) {
    fileManager = initFileManager(fileManagerConfig);
  }

  return {
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
