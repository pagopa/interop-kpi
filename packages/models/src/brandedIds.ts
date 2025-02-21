import crypto from "crypto";
import { z } from "zod";

export const AgreementId = z.string().uuid().brand("AgreementId");
export type AgreementId = z.infer<typeof AgreementId>;

export const DescriptorId = z.string().uuid().brand("DescriptorId");
export type DescriptorId = z.infer<typeof DescriptorId>;

export const EServiceId = z.string().uuid().brand("EServiceId");
export type EServiceId = z.infer<typeof EServiceId>;

export const PurposeId = z.string().uuid().brand("PurposeId");
export type PurposeId = z.infer<typeof PurposeId>;

export const PurposeVersionId = z.string().uuid().brand("PurposeVersionId");
export type PurposeVersionId = z.infer<typeof PurposeVersionId>;

export const TenantId = z.string().uuid().brand("TenantId");
export type TenantId = z.infer<typeof TenantId>;

export const CorrelationId = z.string().brand("CorrelationId");
export type CorrelationId = z.infer<typeof CorrelationId>;

export const ClientId = z.string().uuid().brand("ClientId");
export type ClientId = z.infer<typeof ClientId>;

type IDS =
  | CorrelationId
  | EServiceId
  | AgreementId
  | DescriptorId
  | TenantId
  | PurposeId
  | PurposeVersionId
  | ClientId;

// This function is used to generate a new ID for a new object
// it infers the type of the ID based on how is used the result
// the 'as' is used to cast the uuid string to the inferred type
export function generateId<T extends IDS>(): T {
  return crypto.randomUUID() as T;
}

// This function is used to get a branded ID from a string
// it's an unsafe function because it doesn't check if the string
// is a valid uuid and it doen't check if the string rappresent
// a valid ID for the type.
// The user of this function must be sure that the string is a valid
// uuid and that the string rappresent a valid ID for the type
export function unsafeBrandId<T extends IDS>(id: string): T {
  return id as T;
}
