import {
  FileManagerConfig,
  LoggerConfig,
  S3Config,
  AWSConfig,
  ConsumerConfig,
  DbConfig,
} from "pagopa-interop-kpi-commons";
import { z } from "zod";

export const AlbLogsAnalyticsWriterConfig = AWSConfig.and(ConsumerConfig)
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
        BATCH_SIZE: z.coerce.number().min(100).default(500),
      })
      .transform((c) => ({
        serviceName: c.SERVICE_NAME,
        sqsNotificationEndpoint: c.SQS_NOTIFICATION_ENDPOINT,
        mergeTableSuffix: c.MERGE_TABLE_SUFFIX,
        batchSize: c.BATCH_SIZE,
      }))
  );

export type AlbLogsAnalyticsWriterConfig = z.infer<
  typeof AlbLogsAnalyticsWriterConfig
>;

export const config: AlbLogsAnalyticsWriterConfig =
  AlbLogsAnalyticsWriterConfig.parse(process.env);
