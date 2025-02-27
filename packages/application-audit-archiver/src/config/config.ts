import {
  LoggerConfig,
  KafkaConsumerConfig,
  KafkaTopicConfig,
  FileManagerConfig,
} from "pagopa-interop-kpi-commons";
import { z } from "zod";

const applicationAuditArchiverConfig = LoggerConfig.and(KafkaConsumerConfig)
  .and(KafkaTopicConfig)
  .and(FileManagerConfig)
  .and(
    z
      .object({
        SERVICE_NAME: z.string(),
        S3_BUCKET_NAME: z.string(),
      })
      .transform((c) => ({
        applicationName: c.SERVICE_NAME,
        s3BucketName: c.S3_BUCKET_NAME,
      }))
  );

export type ApplicationAuditArchiverConfig = z.infer<
  typeof applicationAuditArchiverConfig
>;

export const config: ApplicationAuditArchiverConfig = {
  ...applicationAuditArchiverConfig.parse(process.env),
};
