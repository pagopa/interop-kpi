import { ClientId, TenantId, UserId } from "pagopa-interop-kpi-models";
import { z, ZodSchema } from "zod";

export const CNFAuditDetails = z.object({
  jkt: z.string(),
});
export type CNFAuditDetails = z.infer<typeof CNFAuditDetails>;

export const ApiClientAssertionAuditDetails = z.object({
  jwtId: z.string(),
  issuedAt: z.number(),
  algorithm: z.string(),
  keyId: z.string(),
  issuer: z.string(),
  subject: ClientId,
  audience: z.string(),
  expirationTime: z.number(),
});
export type ApiClientAssertionAuditDetails = z.infer<
  typeof ApiClientAssertionAuditDetails
>;

const JWKKey = z.object({
  alg: z.string(),
  e: z.string(),
  kid: z.string(),
  kty: z.string(),
  n: z.string(),
  use: z.string(),
});

export const JWKKeyRS256 = JWKKey.pick({
  kty: true,
  n: true,
  e: true,
}).strict();
export type JWKKeyRS256 = z.infer<typeof JWKKeyRS256>;

export const JWKKeyES256 = z
  .object({
    crv: z.string(),
    kty: z.string(),
    x: z.string(),
    y: z.string(),
  })
  .strict();
export type JWKKeyES256 = z.infer<typeof JWKKeyES256>;

export const DPoPAuditDetails = z.object({
  typ: z.string(),
  alg: z.string(),
  jwk: JWKKeyRS256.or(JWKKeyES256),
  htm: z.string(),
  htu: z.string(),
  iat: z.number().int().min(0),
  jti: z.string(),
});
export type DPoPAuditDetails = z.infer<typeof DPoPAuditDetails>;

export const GeneratedApiTokenAuditDetails = z
  .object({
    jwtId: z.string(),
    correlationId: z.string().optional(),
    issuedAt: z.number(),
    clientId: ClientId,
    organizationId: TenantId,
    adminId: UserId.optional(),
    algorithm: z.string(),
    keyId: z.string(),
    typ: z.string().optional(),
    audience: z.string(),
    subject: z.string(),
    notBefore: z.number(),
    expirationTime: z.number(),
    issuer: z.string(),
    cnf: CNFAuditDetails.optional(),
    clientAssertion: ApiClientAssertionAuditDetails,
    dpop: DPoPAuditDetails.optional(),
  })
  .extend({
    originFileReference: z.string().nullish(),
  });
export type GeneratedApiTokenAuditDetails = z.infer<
  typeof GeneratedApiTokenAuditDetails
>;

export const tokenAuditSchema =
  GeneratedApiTokenAuditDetails as unknown as ZodSchema<
    z.infer<typeof GeneratedApiTokenAuditDetails>
  >;
