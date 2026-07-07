import {
  ClientId,
  TenantId,
  AgreementId,
  EServiceId,
  DescriptorId,
  PurposeId,
  PurposeVersionId,
} from "pagopa-interop-kpi-models";
import { z, ZodSchema } from "zod";

export const ClientAssertionDigest = z
  .object({
    alg: z.string(),
    value: z.string(),
  })
  .strict();
export type ClientAssertionDigest = z.infer<typeof ClientAssertionDigest>;

export const CNFAuditDetails = z.object({
  jkt: z.string(),
});
export type CNFAuditDetails = z.infer<typeof CNFAuditDetails>;

export const ClientAssertionAuditDetails = z.object({
  jwtId: z.string(),
  issuedAt: z.number(),
  algorithm: z.string(),
  keyId: z.string(),
  issuer: z.string(),
  subject: ClientId,
  audience: z.string(),
  expirationTime: z.number(),
  digest: ClientAssertionDigest.optional(),
});
export type ClientAssertionAuditDetails = z.infer<
  typeof ClientAssertionAuditDetails
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

export const GeneratedTokenAuditDetails = z
  .object({
    jwtId: z.string(),
    correlationId: z.string().optional(),
    issuedAt: z.number(),
    clientId: ClientId,
    organizationId: TenantId,
    agreementId: AgreementId,
    eserviceId: EServiceId,
    descriptorId: DescriptorId,
    purposeId: PurposeId,
    purposeVersionId: PurposeVersionId,
    algorithm: z.string(),
    keyId: z.string(),
    typ: z.string(),
    audience: z.string(),
    subject: z.string(),
    notBefore: z.number(),
    expirationTime: z.number(),
    issuer: z.string(),
    cnf: CNFAuditDetails.optional(),
    digest: ClientAssertionDigest.optional(),
    clientAssertion: ClientAssertionAuditDetails,
    dpop: DPoPAuditDetails.optional(),
  })
  .extend({
    originFileReference: z.string().nullish(),
  });
export type GeneratedTokenAuditDetails = z.infer<
  typeof GeneratedTokenAuditDetails
>;

export const tokenAuditSchema =
  GeneratedTokenAuditDetails as unknown as ZodSchema<
    z.infer<typeof GeneratedTokenAuditDetails>
  >;
