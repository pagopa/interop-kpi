import {
  LoggerConfig,
  KafkaConsumerConfig,
  KafkaTopicConfig,
} from "pagopa-interop-kpi-commons";
import { z } from "zod";

const applicationAuditArchiverConfig = LoggerConfig.and(KafkaConsumerConfig)
  .and(KafkaTopicConfig)
  .and(
    z
      .object({
        APPLICATION_NAME: z.string(),
        API_OPERATIONS_BASEURL: z.string(),
      })
      .transform((c) => ({
        applicationName: c.APPLICATION_NAME,
      }))
  );

export type ApplicationAuditArchiverConfig = z.infer<
  typeof applicationAuditArchiverConfig
>;

export const config: ApplicationAuditArchiverConfig = {
  ...applicationAuditArchiverConfig.parse(process.env),
};
