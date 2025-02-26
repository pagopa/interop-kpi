import { GeneratedTokenAuditDetails } from "../domain/models.js";

export interface ClientAssertionSchema {
  jwt_id: string;
  issued_at: Date;
  algorithm: string;
  key_id: string;
  issuer: string;
  subject: string;
  audience: string;
  expiration_time: Date;
}

export interface GeneratedTokenAuditDetailsSchema {
  jwt_id: string;
  correlation_id: string;
  issued_at: Date;
  client_id: string;
  organization_id: string;
  agreement_id: string;
  eservice_id: string;
  descriptor_id: string;
  purpose_id: string;
  purpose_version_id: string;
  algorithm: string;
  key_id: string;
  audience: string;
  subject: string;
  not_before: Date;
  expiration_time: Date;
  issuer: string;
  client_assertion_jwt_id: string;
}

/**
 * ClientAssertionMapping is a type alias that defines a mapping interface to convert
 * a GeneratedTokenAuditDetails record into a shape that conforms to ClientAssertionSchema.
 * It ensures that the output of each mapping function exactly matches the expected type
 * for the corresponding column defined in ClientAssertionSchema.
 */
export type ClientAssertionMapping = {
  [K in keyof ClientAssertionSchema]: (
    record: GeneratedTokenAuditDetails
  ) => ClientAssertionSchema[K];
};

/**
 * TokenAuditMapping is a type alias that defines a mapping interface to convert
 * a GeneratedTokenAuditDetails record into a shape that conforms to GeneratedTokenAuditDetailsSchema.
 * It ensures that the output of each mapping function exactly matches the expected type
 * for the corresponding column defined in GeneratedTokenAuditDetailsSchema.
 */
export type TokenAuditMapping = {
  [K in keyof GeneratedTokenAuditDetailsSchema]: (
    record: GeneratedTokenAuditDetails
  ) => GeneratedTokenAuditDetailsSchema[K];
};
