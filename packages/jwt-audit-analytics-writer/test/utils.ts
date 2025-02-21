import { setupTestContainersVitest } from "pagopa-interop-kpi-commons-test";
import {
  AgreementId,
  ClientId,
  DescriptorId,
  EServiceId,
  GeneratedTokenAuditDetails,
  generateId,
  PurposeId,
  PurposeVersionId,
  TenantId,
} from "pagopa-interop-kpi-models";
import { afterEach, inject } from "vitest";
import { dateToSeconds } from "pagopa-interop-kpi-commons";

export const { cleanup, fileManager } = await setupTestContainersVitest(
  inject("fileManagerConfig")
);

afterEach(cleanup);

export const getMockAuditMessage = (): GeneratedTokenAuditDetails => {
  const correlationId = generateId();
  const eserviceId = generateId<EServiceId>();
  const descriptorId = generateId<DescriptorId>();
  const agreementId = generateId<AgreementId>();
  const clientId = generateId<ClientId>();
  const purposeId = generateId<PurposeId>();
  const kid = "kid";
  const purposeVersionId = generateId<PurposeVersionId>();
  const consumerId = generateId<TenantId>();
  const clientAssertionJti = generateId();

  return {
    correlationId,
    eserviceId,
    descriptorId,
    agreementId,
    subject: clientId,
    audience: "pagopa.it",
    purposeId,
    algorithm: "RS256",
    clientId,
    keyId: kid,
    purposeVersionId,
    jwtId: generateId(),
    issuedAt: dateToSeconds(new Date()),
    issuer: "interop jwt issuer",
    expirationTime: dateToSeconds(new Date()),
    organizationId: consumerId,
    notBefore: 0,
    clientAssertion: {
      subject: clientId,
      audience: "pagopa.it",
      algorithm: "RS256",
      keyId: kid,
      jwtId: clientAssertionJti,
      issuedAt: dateToSeconds(new Date()),
      issuer: consumerId,
      expirationTime: dateToSeconds(new Date()),
    },
  };
};

export const sqsMessagesMock = {
  validMessage: {
    Records: [
      {
        s3: {
          object: {
            key: "jwt-audit.ndjson",
          },
        },
      },
    ],
  },
  emptyS3KeyMessage: {
    Records: [
      {
        s3: {
          object: {
            key: "",
          },
        },
      },
    ],
  },
  emptyS3RecordsMessage: {
    Records: [],
  },
} as const;
