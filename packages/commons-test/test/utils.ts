import { inject, afterEach } from "vitest";
import { setupTestContainersVitest } from "../src/index.js";

export const { cleanup, fileManager } = await setupTestContainersVitest(
  inject("fileManagerConfig")
);

afterEach(cleanup);

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const s3Bucket = inject("fileManagerConfig")!.s3Bucket;
