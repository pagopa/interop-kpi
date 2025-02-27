import { GeneratedTokenAuditDetails } from "./domain/models.js";

export const JwtGeneratedDatabaseTable = {
  client_assertion: "client_assertion_audit_details",
  generated_token: "generated_token_audit_details",
} as const;

export type JwtGeneratedDatabaseTable =
  (typeof JwtGeneratedDatabaseTable)[keyof typeof JwtGeneratedDatabaseTable];

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

export interface GeneratedTokenSchema {
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
 * GeneratedTokenMapping is a type alias that defines a mapping interface to convert
 * a GeneratedTokenAuditDetails record into a shape that conforms to GeneratedTokenSchema.
 * It ensures that the output of each mapping function exactly matches the expected type
 * for the corresponding column defined in GeneratedTokenSchema.
 */
export type GeneratedTokenMapping = {
  [K in keyof GeneratedTokenSchema]: (
    record: GeneratedTokenAuditDetails
  ) => GeneratedTokenSchema[K];
};
