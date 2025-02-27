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
        RUN_UNTIL_QUEUE_IS_EMPTY: z.coerce.boolean(),
      })
      .transform((c) => ({
        serviceName: c.SERVICE_NAME,
        sqsNotificationEndpoint: c.SQS_NOTIFICATION_ENDPOINT,
        consumerPollingTimeout: c.CONSUMER_POLLING_TIMEOUT_IN_SECONDS,
        runUntilQueueIsEmpty: c.RUN_UNTIL_QUEUE_IS_EMPTY,
      }))
  );

export type AlbLogsAnalyticsWriterConfig = z.infer<
  typeof AlbLogsAnalyticsWriterConfig
>;

export const config: AlbLogsAnalyticsWriterConfig =
  AlbLogsAnalyticsWriterConfig.parse(process.env);
