import {
  LoggerConfig,
  KafkaConsumerConfig,
  KafkaTopicConfig,
  KafkaBatchConsumerConfig,
} from "pagopa-interop-kpi-commons";
import { z } from "zod";

const applicationAuditAnalyticsWriterConfig = LoggerConfig.and(
  KafkaConsumerConfig
)
  .and(KafkaTopicConfig)
  .and(
    z
      .object({
        SERVICE_NAME: z.string(),
        DB_MESSAGES_TO_INSERT_PER_BATCH: z.coerce
          .number()
          .min(100)
          .default(500),
      })
      .transform((c) => ({
        serviceName: c.SERVICE_NAME,
        msgsInsertPerBatch: c.DB_MESSAGES_TO_INSERT_PER_BATCH,
      }))
  );

export type applicationAuditAnalyticsWriterConfig = z.infer<
  typeof applicationAuditAnalyticsWriterConfig
>;

export const config: applicationAuditAnalyticsWriterConfig =
  applicationAuditAnalyticsWriterConfig.parse(process.env);

export const batchConsumerConfig: KafkaBatchConsumerConfig =
  KafkaBatchConsumerConfig.parse(process.env);
