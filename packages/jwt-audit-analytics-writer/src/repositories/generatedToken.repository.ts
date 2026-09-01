/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { DBConnection } from "pagopa-interop-kpi-commons";
import { jwtAuditRepositoryBuilder } from "pagopa-interop-jwt-audit-commons";
import { JwtDbTable } from "pagopa-interop-kpi-models";
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
  client_assertion_jwt_id: (record) => record.clientAssertion.jwtId,
  origin_file_reference: (record) => record.originFileReference,
  typ: (record) => record.typ,
  cnf_jkt: (record) => record.cnf?.jkt,
  digest_alg: (record) => record.digest?.alg,
  digest_val: (record) => record.digest?.value,
  dpop_jwt_id: (record) => record.dpop?.jti,
};

export function generatedTokenRepository(conn: DBConnection) {
  return jwtAuditRepositoryBuilder<
    GeneratedTokenAuditDetails,
    typeof GeneratedTokenSchema.shape
  >(conn, config, {
    tableName: JwtDbTable.generated_token,
    tableSchema: GeneratedTokenSchema,
    mapping: generatedTokenMapping,
    mergeKeys: ["jwt_id"],
    mergeTimeFilter: {
      column: "issued_at_tz",
    },
    deduplication: {
      partitionKey: "jwt_id",
      orderBy: "issued_at",
    },
  });
}

export type GeneratedTokenRepository = ReturnType<
  typeof generatedTokenRepository
>;
