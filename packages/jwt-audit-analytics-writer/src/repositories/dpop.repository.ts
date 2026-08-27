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
import { DPoPMapping, DPoPSchema } from "../model/db.js";
import {
  GeneratedTokenAuditDetails,
  JWKKeyES256,
  JWKKeyRS256,
} from "../model/domain/models.js";

/**
 * IMPORTANT:
 * Field order MUST match exactly the column order of
 * `jwt.dpop_audit`.
 *
 * This mapping is used to generate CSV files for Redshift COPY,
 * which relies on column position, not names.
 */
export const dpopMapping: DPoPMapping = {
  typ: (record) => record.dpop?.typ as string,
  alg: (record) => record.dpop?.alg as string,

  jwk_kty: (record) => (record.dpop?.jwk as JWKKeyES256)?.kty,
  jwk_n: (record) => (record.dpop?.jwk as JWKKeyRS256)?.n,
  jwk_e: (record) => (record.dpop?.jwk as JWKKeyRS256)?.e,
  jwk_crv: (record) => (record.dpop?.jwk as JWKKeyES256)?.crv,
  jwk_x: (record) => (record.dpop?.jwk as JWKKeyES256)?.x,
  jwk_y: (record) => (record.dpop?.jwk as JWKKeyES256)?.y,
  htm: (record) => record.dpop?.htm as string,
  htu: (record) => record.dpop?.htu as string,
  iat: (record) => record.dpop?.iat as number,
  jti: (record) => record.dpop?.jti as string,

  generated_token_jwt_id: (record) => record.jwtId,
  origin_file_reference: (record) => record.originFileReference,
  generated_token_issued_at: (record) => record.issuedAt,
  generated_token_issued_at_tz: (record) => new Date(record.issuedAt),
};

export function dpopRepository(conn: DBConnection) {
  const dpopTable = JwtDbTable.dpop;
  const dpopStagingTable = `${dpopTable}${config.mergeTableSuffix}`;

  return {
    async copyFromS3ToStaging(s3ObjectKey: string): Promise<void> {
      try {
        const copyQuery = `
          COPY ${dpopStagingTable}
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
          `Error copying data from S3 to staging ${dpopStagingTable}: ${error}`
        );
      }
    },

    async insert(
      t: ITask<unknown>,
      pgp: IMain,
      records: GeneratedTokenAuditDetails[]
    ): Promise<void> {
      try {
        const dpopColumnSet = buildColumnSet<GeneratedTokenAuditDetails>(
          pgp,
          dpopMapping,
          dpopStagingTable
        );

        const recordsWithDpop = records.filter((record) => record.dpop);

        if (recordsWithDpop.length === 0) {
          return;
        }

        await t.none(pgp.helpers.insert(recordsWithDpop, dpopColumnSet));
      } catch (error: unknown) {
        throw genericInternalError(
          `Error inserting into ${dpopStagingTable} staging table: ${error}`
        );
      }
    },

    async merge(t: ITask<unknown>): Promise<void> {
      try {
        const dpopMergeQuery = generateMergeQuery(
          DPoPSchema,
          config.dbSchemaName,
          dpopTable,
          config.mergeTableSuffix,
          ["generated_token_jwt_id"],
          {
            joinTimeFilterColumn: "generated_token_issued_at_tz",
            maxDaysTolerance: config.maxDaysToleranceForDuplicateDelay,
          }
        );
        await t.none(dpopMergeQuery);
      } catch (error: unknown) {
        throw genericInternalError(
          `Error merging staging to target ${dpopTable} table: ${error}`
        );
      }
    },

    async deduplicate(t: ITask<unknown>): Promise<void> {
      try {
        const deduplicationQuery = generateDeduplicationQuery(
          dpopStagingTable,
          "generated_token_jwt_id",
          "iat"
        );
        await t.none(deduplicationQuery);
      } catch (error: unknown) {
        throw genericInternalError(
          `Error deduplicating staging ${dpopStagingTable} table: ${error}`
        );
      }
    },

    async clean(): Promise<void> {
      try {
        await conn.none(`TRUNCATE TABLE ${dpopStagingTable};`);
      } catch (error: unknown) {
        throw genericInternalError(
          `Error cleaning staging ${dpopStagingTable} table: ${error}`
        );
      }
    },
  };
}

export type DPoPRepository = ReturnType<typeof dpopRepository>;
