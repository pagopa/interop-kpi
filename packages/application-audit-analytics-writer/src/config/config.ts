import {
  LoggerConfig,
  KafkaConsumerConfig,
  KafkaTopicConfig,
  KafkaBatchConsumerConfig,
  DbConfig,
  FileManagerConfig,
} from "pagopa-interop-kpi-commons";
import { z } from "zod";

const applicationAuditAnalyticsWriterConfig = LoggerConfig.and(
  KafkaConsumerConfig
)
  .and(KafkaTopicConfig)
  .and(DbConfig)
  .and(FileManagerConfig)
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
        MAX_DAYS_TOLERANCE_FOR_DUPLICATE_DELAY: z.coerce
          .number()
          .min(1)
          .default(1),
        S3_COPY_BUCKET: z.string(),
        S3_DELETE_AFTER_COPY: z
          .enum(["true", "false"])
          .transform((value) => value === "true"),
        GZ_COMPRESSION_LEVEL: z.coerce.number().default(6),
        REDSHIFT_COPY_IAM_ROLE_ARN: z.string(),
        DB_INGEST_MODE: z.enum(["INSERT", "COPY"]).default("INSERT"),
      })
      .transform((c) => ({
        serviceName: c.SERVICE_NAME,
        msgsInsertPerBatch: c.DB_MESSAGES_TO_INSERT_PER_BATCH,
        mergeTableSuffix: c.MERGE_TABLE_SUFFIX,
        maxDaysToleranceForDuplicateDelay:
          c.MAX_DAYS_TOLERANCE_FOR_DUPLICATE_DELAY,
        s3CopyBucket: c.S3_COPY_BUCKET,
        s3DeleteAfterCopy: c.S3_DELETE_AFTER_COPY,
        gzCompressionLevel: c.GZ_COMPRESSION_LEVEL,
        redshiftIamRole: c.REDSHIFT_COPY_IAM_ROLE_ARN,
        dbIngestMode: c.DB_INGEST_MODE,
      }))
  );

export type applicationAuditAnalyticsWriterConfig = z.infer<
  typeof applicationAuditAnalyticsWriterConfig
>;

export const config: applicationAuditAnalyticsWriterConfig =
  applicationAuditAnalyticsWriterConfig.parse(process.env);

export const batchConsumerConfig: KafkaBatchConsumerConfig =
  KafkaBatchConsumerConfig.parse(process.env);
