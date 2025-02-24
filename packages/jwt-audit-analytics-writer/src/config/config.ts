import {
  FileManagerConfig,
  LoggerConfig,
  S3Config,
  AWSConfig,
  ConsumerConfig,
  DbConfig,
} from "pagopa-interop-kpi-commons";
import { z } from "zod";

export const JwtAuditAnalyticsWriterConfig = AWSConfig.and(ConsumerConfig)
  .and(LoggerConfig)
  .and(FileManagerConfig)
  .and(S3Config)
  .and(DbConfig)
  .and(
    z
      .object({
        SERVICE_NAME: z.string(),
        SQS_NOTIFICATION_ENDPOINT: z.string(),
        MERGE_TABLE_SUFFIX: z.string(),
      })
      .transform((c) => ({
        serviceName: c.SERVICE_NAME,
        sqsNotificationEndpoint: c.SQS_NOTIFICATION_ENDPOINT,
        mergeTableSuffix: c.MERGE_TABLE_SUFFIX,
      }))
  );

export type JwtAuditAnalyticsWriterConfig = z.infer<
  typeof JwtAuditAnalyticsWriterConfig
>;

export const config: JwtAuditAnalyticsWriterConfig =
  JwtAuditAnalyticsWriterConfig.parse(process.env);
