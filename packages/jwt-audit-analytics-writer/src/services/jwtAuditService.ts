/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { Readable } from "stream";
import {
  AppContext,
  FileManager,
  WithSQSMessageId,
  logger,
} from "pagopa-interop-kpi-commons";
import { GeneratedTokenAuditDetails } from "pagopa-interop-kpi-models";
import * as ndjson from "ndjson";
import { insertJwtAuditError } from "../model/domain/errors.js";
import { config } from "../config/config.js";

export const jwtAuditServiceBuilder = (fileManager: FileManager) => ({
  async handleMessage(
    s3KeyPath: string,
    ctx: WithSQSMessageId<AppContext>
  ): Promise<void> {
    try {
      const jwtAuditBuffer = await fileManager.get(
        config.s3Bucket,
        s3KeyPath,
        logger(ctx)
      );
      const jwtAuditString = new TextDecoder().decode(jwtAuditBuffer);
      const jwtAuditStream = Readable.from(jwtAuditString).pipe(ndjson.parse());

      logger(ctx).info(`Reading and processing jwt audit file: ${s3KeyPath}`);

      for await (const rawRecord of jwtAuditStream) {
        const record = GeneratedTokenAuditDetails.safeParse(rawRecord);
        if (record.success) {
          // eslint-disable-next-line no-console
          console.log(`Record data: ${record.data}`);
        } else {
          logger(ctx).error(
            `Invalid record for file: ${s3KeyPath}. Data: ${JSON.stringify(
              record
            )}. Details: ${JSON.stringify(record.error)}}`
          );
        }
      }
    } catch (error: unknown) {
      throw insertJwtAuditError(`Error inserting JWT Audit. Details: ${error}`);
    }
  },
});

export type JwtAuditService = ReturnType<typeof jwtAuditServiceBuilder>;
