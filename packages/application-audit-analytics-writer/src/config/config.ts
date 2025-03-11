import {
  LoggerConfig,
  KafkaConsumerConfig,
  KafkaTopicConfig,
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
      })
      .transform((c) => ({
        serviceName: c.SERVICE_NAME,
      }))
  );

export type applicationAuditAnalyticsWriterConfig = z.infer<
  typeof applicationAuditAnalyticsWriterConfig
>;

export const config: applicationAuditAnalyticsWriterConfig =
  applicationAuditAnalyticsWriterConfig.parse(process.env);
