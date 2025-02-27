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
        CONSUMER_POLLING_TIMEOUT_IN_SECONDS: z.coerce.number().min(1),
        MERGE_TABLE_SUFFIX: z.string(),
      })
      .transform((c) => ({
        serviceName: c.SERVICE_NAME,
        sqsNotificationEndpoint: c.SQS_NOTIFICATION_ENDPOINT,
        consumerPollingTimeout: c.CONSUMER_POLLING_TIMEOUT_IN_SECONDS,
        mergeTableSuffix: c.MERGE_TABLE_SUFFIX,
      }))
  );

export type AlbLogsAnalyticsWriterConfig = z.infer<
  typeof AlbLogsAnalyticsWriterConfig
>;

export const config: AlbLogsAnalyticsWriterConfig =
  AlbLogsAnalyticsWriterConfig.parse(process.env);
