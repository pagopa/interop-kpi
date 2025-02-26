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

export const ClientAssertionAuditDetails = z.object({
  jwtId: z.string(),
  issuedAt: z.number(),
  algorithm: z.string(),
  keyId: z.string(),
  issuer: z.string(),
  subject: ClientId,
  audience: z.string(),
  expirationTime: z.number(),
});
export type ClientAssertionAuditDetails = z.infer<
  typeof ClientAssertionAuditDetails
>;

export const GeneratedTokenAuditDetails = z.object({
  jwtId: z.string(),
  correlationId: z.string(),
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
  audience: z.string(),
  subject: z.string(),
  notBefore: z.number(),
  expirationTime: z.number(),
  issuer: z.string(),
  clientAssertion: ClientAssertionAuditDetails,
});
export type GeneratedTokenAuditDetails = z.infer<
  typeof GeneratedTokenAuditDetails
>;

export const tokenAuditSchema =
  GeneratedTokenAuditDetails as unknown as ZodSchema<
    z.infer<typeof GeneratedTokenAuditDetails>
  >;
