import { z } from "zod";
import { GeneratedTokenAuditDetails } from "./domain/models.js";

export const ClientAssertionSchema = z.object({
  jwt_id: z.string(),
  issued_at: z.number().int(),
  issued_at_tz: z.date(),
  issued_at_raw: z.coerce.number(),
  algorithm: z.string(),
  key_id: z.string(),
  issuer: z.string(),
  subject: z.string(),
  audience: z.string(),
  expiration_time: z.number().int(),
  expiration_time_tz: z.date(),
  expiration_time_raw: z.coerce.number(),
  generated_token_jwt_id: z.string(),
});
export type ClientAssertionSchema = z.infer<typeof ClientAssertionSchema>;

export const GeneratedTokenSchema = z.object({
  jwt_id: z.string(),
  correlation_id: z.string().optional(),
  issued_at: z.number().int(),
  issued_at_tz: z.date(),
  client_id: z.string(),
  organization_id: z.string(),
  agreement_id: z.string(),
  eservice_id: z.string(),
  descriptor_id: z.string(),
  purpose_id: z.string(),
  purpose_version_id: z.string(),
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
});
export type GeneratedTokenSchema = z.infer<typeof GeneratedTokenSchema>;

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
