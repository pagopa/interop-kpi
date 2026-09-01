/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { DBConnection } from "pagopa-interop-kpi-commons";
import {
  jwtAuditRepositoryBuilder,
  selectRecordsWithDpop,
} from "pagopa-interop-jwt-audit-commons";
import { JwtDbTable } from "pagopa-interop-kpi-models";
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
  return jwtAuditRepositoryBuilder<
    GeneratedTokenAuditDetails,
    typeof DPoPSchema.shape
  >(conn, config, {
    tableName: JwtDbTable.dpop,
    tableSchema: DPoPSchema,
    mapping: dpopMapping,
    mergeKeys: ["generated_token_jwt_id"],
    mergeTimeFilter: {
      column: "generated_token_issued_at_tz",
    },
    deduplication: {
      partitionKey: "generated_token_jwt_id",
      orderBy: "iat",
    },
    selectRecords: selectRecordsWithDpop,
  });
}

export type DPoPRepository = ReturnType<typeof dpopRepository>;
