/* eslint-disable @typescript-eslint/explicit-function-return-type */
import {
  DBConnection,
  normalizeTimestampToMilliseconds,
} from "pagopa-interop-kpi-commons";
import { jwtAuditRepositoryBuilder } from "pagopa-interop-jwt-audit-commons";
import { M2MJwtDbTable } from "pagopa-interop-kpi-models";
import { config } from "../config/config.js";
import { ClientAssertionMapping, ClientAssertionSchema } from "../model/db.js";
import { GeneratedApiTokenAuditDetails } from "../model/domain/models.js";

/**
 * IMPORTANT:
 * Field order MUST match exactly the column order of
 * `jwt.m2m_client_assertion_audit`.
 *
 * This mapping is used to generate CSV files for Redshift COPY,
 * which relies on column position, not names.
 */
export const clientAssertionMapping: ClientAssertionMapping = {
  jwt_id: (record) => record.clientAssertion.jwtId,
  issued_at: (record) =>
    normalizeTimestampToMilliseconds(record.clientAssertion.issuedAt),
  issued_at_tz: (record) =>
    new Date(normalizeTimestampToMilliseconds(record.clientAssertion.issuedAt)),
  algorithm: (record) => record.clientAssertion.algorithm,
  key_id: (record) => record.clientAssertion.keyId,
  issuer: (record) => record.clientAssertion.issuer,
  subject: (record) => record.clientAssertion.subject,
  audience: (record) => record.clientAssertion.audience,
  expiration_time: (record) =>
    normalizeTimestampToMilliseconds(record.clientAssertion.expirationTime),
  expiration_time_tz: (record) =>
    new Date(
      normalizeTimestampToMilliseconds(record.clientAssertion.expirationTime)
    ),
  generated_token_jwt_id: (record) => record.jwtId,
  issued_at_raw: (record) => record.clientAssertion.issuedAt,
  expiration_time_raw: (record) => record.clientAssertion.expirationTime,
  origin_file_reference: (record) => record.originFileReference,
  generated_token_issued_at: (record) => record.issuedAt,
  generated_token_issued_at_tz: (record) => new Date(record.issuedAt),
};

export function clientAssertionRepository(conn: DBConnection) {
  return jwtAuditRepositoryBuilder<
    GeneratedApiTokenAuditDetails,
    typeof ClientAssertionSchema.shape
  >(conn, config, {
    tableName: M2MJwtDbTable.client_assertion,
    tableSchema: ClientAssertionSchema,
    mapping: clientAssertionMapping,
    mergeKeys: ["generated_token_jwt_id"],
    mergeTimeFilter: {
      column: "generated_token_issued_at_tz",
    },
    deduplication: {
      partitionKey: "generated_token_jwt_id",
      orderBy: "issued_at",
    },
  });
}

export type ClientAssertionRepository = ReturnType<
  typeof clientAssertionRepository
>;
