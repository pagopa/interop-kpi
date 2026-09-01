import { z } from "zod";
import { GeneratedApiTokenAuditDetails } from "./domain/models.js";

export const ClientAssertionSchema = z.object({
  jwt_id: z.string(),
  issued_at: z.number().int(),
  issued_at_tz: z.date(),
  algorithm: z.string(),
  key_id: z.string(),
  issuer: z.string(),
  subject: z.string(),
  audience: z.string(),
  expiration_time: z.number().int(),
  expiration_time_tz: z.date(),
  generated_token_jwt_id: z.string(),
  issued_at_raw: z.coerce.number(),
  expiration_time_raw: z.coerce.number(),
  origin_file_reference: z.string().nullish(),
  generated_token_issued_at: z.number().int(),
  generated_token_issued_at_tz: z.date(),
});
export type ClientAssertionSchema = z.infer<typeof ClientAssertionSchema>;

export const GeneratedApiTokenSchema = z.object({
  jwt_id: z.string(),
  correlation_id: z.string().optional(),
  issued_at: z.number().int(),
  issued_at_tz: z.date(),
  client_id: z.string(),
  organization_id: z.string(),
  admin_id: z.string().optional(),
  algorithm: z.string(),
  key_id: z.string(),
  audience: z.string(),
  subject: z.string(),
  not_before: z.number().int(),
  not_before_tz: z.date(),
  expiration_time: z.number().int(),
  expiration_time_tz: z.date(),
  issuer: z.string(),
  client_assertion_jwt_id: z.string(),
  origin_file_reference: z.string().nullish(),
  typ: z.string().optional(),
  cnf_jkt: z.string().optional(),
  dpop_jwt_id: z.string().optional(),
});
export type GeneratedApiTokenSchema = z.infer<typeof GeneratedApiTokenSchema>;

export const DPoPSchema = z.object({
  typ: z.string(),
  alg: z.string(),
  jwk_kty: z.string(),
  jwk_n: z.string().optional(),
  jwk_e: z.string().optional(),
  jwk_crv: z.string().optional(),
  jwk_x: z.string().optional(),
  jwk_y: z.string().optional(),
  htm: z.string(),
  htu: z.string(),
  iat: z.coerce.number(),
  jti: z.string(),
  generated_token_jwt_id: z.string(),
  origin_file_reference: z.string().nullish(),
  generated_token_issued_at: z.number().int(),
  generated_token_issued_at_tz: z.date(),
});
export type DPoPSchema = z.infer<typeof DPoPSchema>;

export type DPoPMapping = {
  [K in keyof DPoPSchema]: (
    record: GeneratedApiTokenAuditDetails
  ) => DPoPSchema[K];
};

/**
 * ClientAssertionMapping is a type alias that defines a mapping interface to convert
 * a GeneratedApiTokenAuditDetails record into a shape that conforms to ClientAssertionSchema.
 * It ensures that the output of each mapping function exactly matches the expected type
 * for the corresponding column defined in ClientAssertionSchema.
 */
export type ClientAssertionMapping = {
  [K in keyof ClientAssertionSchema]: (
    record: GeneratedApiTokenAuditDetails
  ) => ClientAssertionSchema[K];
};

/**
 * GeneratedApiTokenMapping is a type alias that defines a mapping interface to convert
 * a GeneratedApiTokenAuditDetails record into a shape that conforms to GeneratedApiTokenSchema.
 * It ensures that the output of each mapping function exactly matches the expected type
 * for the corresponding column defined in GeneratedApiTokenSchema.
 */
export type GeneratedApiTokenMapping = {
  [K in keyof GeneratedApiTokenSchema]: (
    record: GeneratedApiTokenAuditDetails
  ) => GeneratedApiTokenSchema[K];
};
