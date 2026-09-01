import {
  FileManagerConfig,
  LoggerConfig,
  S3Config,
  AWSConfig,
  SQSConsumerConfig,
  DbConfig,
} from "pagopa-interop-kpi-commons";
import { JwtAuditConfig } from "pagopa-interop-jwt-audit-commons";
import { z } from "zod";

export const JwtAuditAnalyticsWriterConfig = AWSConfig.and(SQSConsumerConfig)
  .and(LoggerConfig)
  .and(FileManagerConfig)
  .and(S3Config)
  .and(DbConfig)
  .and(JwtAuditConfig);

export type JwtAuditAnalyticsWriterConfig = z.infer<
  typeof JwtAuditAnalyticsWriterConfig
>;

export const config: JwtAuditAnalyticsWriterConfig =
  JwtAuditAnalyticsWriterConfig.parse(process.env);
