import {
  LoggerConfig,
  KafkaConsumerConfig,
  KafkaTopicConfig,
  KafkaBatchConsumerConfig,
  DbConfig,
} from "pagopa-interop-kpi-commons";
import { z } from "zod";

const applicationAuditAnalyticsWriterConfig = LoggerConfig.and(
  KafkaConsumerConfig
)
  .and(KafkaTopicConfig)
  .and(DbConfig)
  .and(
    z
      .object({
        SERVICE_NAME: z.string(),
        DB_MESSAGES_TO_INSERT_PER_BATCH: z.coerce
          .number()
          .min(100)
          .default(500),
        MERGE_TABLE_SUFFIX: z
          .string()
          .transform((val) => val.replace(/-/g, "")),
      })
      .transform((c) => ({
        serviceName: c.SERVICE_NAME,
        msgsInsertPerBatch: c.DB_MESSAGES_TO_INSERT_PER_BATCH,
        mergeTableSuffix: c.MERGE_TABLE_SUFFIX,
      }))
  );

export type applicationAuditAnalyticsWriterConfig = z.infer<
  typeof applicationAuditAnalyticsWriterConfig
>;

export const config: applicationAuditAnalyticsWriterConfig =
  applicationAuditAnalyticsWriterConfig.parse(process.env);

export const batchConsumerConfig: KafkaBatchConsumerConfig =
  KafkaBatchConsumerConfig.parse(process.env);
