import { z } from "zod";

export const JwtAuditConfig = z
  .object({
    SERVICE_NAME: z.string(),
    SQS_NOTIFICATION_ENDPOINT: z.string(),
    MERGE_TABLE_SUFFIX: z.string().transform((val) => val.replace(/-/g, "")),
    BATCH_SIZE: z.coerce.number().min(100).default(500),
    MAX_DAYS_TOLERANCE_FOR_DUPLICATE_DELAY: z.coerce.number().optional(),
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
    sqsNotificationEndpoint: c.SQS_NOTIFICATION_ENDPOINT,
    mergeTableSuffix: c.MERGE_TABLE_SUFFIX,
    batchSize: c.BATCH_SIZE,
    maxDaysToleranceForDuplicateDelay: c.MAX_DAYS_TOLERANCE_FOR_DUPLICATE_DELAY,
    s3CopyBucket: c.S3_COPY_BUCKET,
    s3DeleteAfterCopy: c.S3_DELETE_AFTER_COPY,
    gzCompressionLevel: c.GZ_COMPRESSION_LEVEL,
    redshiftIamRole: c.REDSHIFT_COPY_IAM_ROLE_ARN,
    dbIngestMode: c.DB_INGEST_MODE,
  }));

export type JwtAuditConfig = z.infer<typeof JwtAuditConfig>;
