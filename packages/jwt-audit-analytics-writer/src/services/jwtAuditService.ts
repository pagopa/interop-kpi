/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { FileManager, Logger } from "pagopa-interop-kpi-commons";
import { GeneratedTokenAuditDetails } from "pagopa-interop-kpi-models";
import * as ndjson from "ndjson";
import { config } from "../config/config.js";

export const jwtAuditServiceBuilder = (fileManager: FileManager) => ({
  async handleMessage(s3key: string, logger: Logger): Promise<void> {
    const fileStream = await fileManager.get(config.s3Bucket, s3key, logger);
    const parsedFileStream = fileStream.pipe(ndjson.parse());

    logger.info(`Reading and processing jwt audit file: ${s3key}`);

    for await (const rawRecord of parsedFileStream) {
      const record = GeneratedTokenAuditDetails.safeParse(rawRecord);
      if (record.success) {
        // eslint-disable-next-line no-console
        console.log(`Record data: ${record.data}`);
      } else {
        logger.error(
          `Invalid record for file: ${s3key}. Data: ${JSON.stringify(
            record
          )}. Details: ${JSON.stringify(record.error)}}`
        );
      }
    }
  },
});

export type JwtAuditService = ReturnType<typeof jwtAuditServiceBuilder>;
