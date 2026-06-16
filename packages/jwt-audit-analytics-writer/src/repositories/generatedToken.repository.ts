/* eslint-disable @typescript-eslint/explicit-function-return-type */
import {
  DBConnection,
  IMain,
  ITask,
  buildColumnSet,
  generateDeduplicationQuery,
  generateMergeQuery,
} from "pagopa-interop-kpi-commons";
import { genericInternalError, JwtDbTable } from "pagopa-interop-kpi-models";
import { config } from "../config/config.js";
import { GeneratedTokenMapping, GeneratedTokenSchema } from "../model/db.js";
import { GeneratedTokenAuditDetails } from "../model/domain/models.js";

/**
 * IMPORTANT:
 * Field order MUST match exactly the column order of
 * `jwt.generated_token_audit`.
 *
 * This mapping is used to generate CSV files for Redshift COPY,
 * which relies on column position, not names.
 */
export const generatedTokenMapping: GeneratedTokenMapping = {
  jwt_id: (record) => record.jwtId,
  correlation_id: (record) => record.correlationId,
  issued_at: (record) => record.issuedAt,
  issued_at_tz: (record) => new Date(record.issuedAt),
  client_id: (record) => record.clientId,
  organization_id: (record) => record.organizationId,
  agreement_id: (record) => record.agreementId,
  eservice_id: (record) => record.eserviceId,
  descriptor_id: (record) => record.descriptorId,
  purpose_id: (record) => record.purposeId,
  purpose_version_id: (record) => record.purposeVersionId,
  algorithm: (record) => record.algorithm,
  key_id: (record) => record.keyId,
  audience: (record) => record.audience,
  subject: (record) => record.subject,
  not_before: (record) => record.notBefore,
  not_before_tz: (record) => new Date(record.notBefore),
  expiration_time: (record) => record.expirationTime,
  expiration_time_tz: (record) => new Date(record.expirationTime),
  issuer: (record) => record.issuer,
  cnf_jkt: (record) => record.cnf?.jkt,
  digest_alg: (record) => record.digest?.alg,
  digest_val: (record) => record.digest?.value,
  client_assertion_jwt_id: (record) => record.clientAssertion.jwtId,
  dpop_jwt_id: (record) => record.dpop?.jti,
  origin_file_reference: (record) => record.originFileReference,
};

export function generatedTokenRepository(conn: DBConnection) {
  const generatedTokenTable = JwtDbTable.generated_token;
  const tokenAuditStagingTable = `${generatedTokenTable}${config.mergeTableSuffix}`;

  return {
    async copyFromS3ToStaging(s3ObjectKey: string): Promise<void> {
      try {
        const copyQuery = `
          COPY ${tokenAuditStagingTable}
          FROM 's3://${config.s3CopyBucket}/${s3ObjectKey}'
          IAM_ROLE '${config.redshiftIamRole}'
          CSV
          GZIP
          TIMEFORMAT 'auto'
          BLANKSASNULL
          EMPTYASNULL;
        `;

        await conn.none(copyQuery);
      } catch (error: unknown) {
        throw genericInternalError(
          `Error copying data from S3 to staging ${tokenAuditStagingTable}: ${error}`
        );
      }
    },

    async insert(
      t: ITask<unknown>,
      pgp: IMain,
      records: GeneratedTokenAuditDetails[]
    ): Promise<void> {
      try {
        const tokenAuditColumnSet = buildColumnSet<GeneratedTokenAuditDetails>(
          pgp,
          generatedTokenMapping,
          tokenAuditStagingTable
        );

        await t.none(pgp.helpers.insert(records, tokenAuditColumnSet));
      } catch (error: unknown) {
        throw genericInternalError(
          `Error inserting into ${tokenAuditStagingTable} staging table: ${error}`
        );
      }
    },

    async merge(t: ITask<unknown>): Promise<void> {
      try {
        const generatedTokenMergeQuery = generateMergeQuery(
          GeneratedTokenSchema,
          config.dbSchemaName,
          generatedTokenTable,
          config.mergeTableSuffix,
          ["jwt_id"],
          {
            joinTimeFilterColumn: "issued_at_tz",
            maxDaysTolerance: config.maxDaysToleranceForDuplicateDelay,
          }
        );

        await t.none(generatedTokenMergeQuery);
      } catch (error: unknown) {
        throw genericInternalError(
          `Error merging staging to target ${generatedTokenTable} table: ${error}`
        );
      }
    },

    async deduplicate(t: ITask<unknown>): Promise<void> {
      try {
        const deduplicationQuery = generateDeduplicationQuery(
          tokenAuditStagingTable,
          "jwt_id",
          "issued_at"
        );
        await t.none(deduplicationQuery);
      } catch (error: unknown) {
        throw genericInternalError(
          `Error deduplicating staging ${tokenAuditStagingTable} table: ${error}`
        );
      }
    },

    async clean(): Promise<void> {
      try {
        await conn.none(`TRUNCATE TABLE ${tokenAuditStagingTable};`);
      } catch (error: unknown) {
        throw genericInternalError(
          `Error cleaning staging ${tokenAuditStagingTable} table: ${error}`
        );
      }
    },
  };
}

export type GeneratedTokenRepository = ReturnType<
  typeof generatedTokenRepository
>;
