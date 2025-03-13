import {
  LoggerConfig,
  KafkaConsumerConfig,
  KafkaTopicConfig,
  FileManagerConfig,
  KafkaBatchConsumerConfig,
  AWSConfig,
} from "pagopa-interop-kpi-commons";
import { z } from "zod";

const applicationAuditArchiverConfig = LoggerConfig.and(KafkaConsumerConfig)
  .and(KafkaTopicConfig)
  .and(AWSConfig)
  .and(FileManagerConfig)
  .and(
    z
      .object({
        SERVICE_NAME: z.string(),
        S3_BUCKET: z.string(),
        GZ_COMPRESSION_LEVEL: z.coerce.number().default(6),
      })
      .transform((c) => ({
        serviceName: c.SERVICE_NAME,
        s3BucketName: c.S3_BUCKET,
        gzCompressionLevel: c.GZ_COMPRESSION_LEVEL,
      }))
  );

export type ApplicationAuditArchiverConfig = z.infer<
  typeof applicationAuditArchiverConfig
>;

export const config: ApplicationAuditArchiverConfig =
  applicationAuditArchiverConfig.parse(process.env);

export const batchConsumerConfig: KafkaBatchConsumerConfig =
  KafkaBatchConsumerConfig.parse(process.env);
