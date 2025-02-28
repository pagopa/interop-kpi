import { setupTestContainersVitest } from "pagopa-interop-kpi-commons-test";
import { afterEach, inject } from "vitest";
import { LoadBalancerLog } from "../src/model/load-balancer-log.js";

export const { cleanup, fileManager } = await setupTestContainersVitest(
  inject("fileManagerConfig")
);

afterEach(cleanup);

export const getMockAuditMessage = (): LoadBalancerLog => ({
  type: "http",
  time: new Date().toISOString(),
  elb: "mock-elb",
  clientIp: "192.168.1.1",
  clientPort: "443",
  targetIp: "192.168.1.2",
  targetPort: "443",
  requestProcessingTime: "0.001",
  targetProcessingTime: "0.002",
  responseProcessingTime: "0.003",
  elbStatusCode: "200",
  targetStatusCode: "200",
  receivedBytes: "512",
  sentBytes: "1024",
  request: "GET https://mock-url.com HTTP/1.1",
  userAgent: "MockUserAgent",
  sslCipher: "TLS_AES_128_GCM_SHA256",
  sslProtocol: "TLSv1.3",
  targetGroupArn: "mock-target-group-arn",
  traceId: "mock-trace-id",
  domainName: "mock-domain.com",
  chosenCertArn: "mock-cert-arn",
  matchedRulePriority: "1",
  requestCreationTime: new Date().toISOString(),
  actionsExecuted: "mock-action",
  redirectUrl: "https://mock-redirect.com",
  errorReason: "None",
  targetPortList: ["443"],
  targetStatusCodeList: ["200"],
  classification: "success",
  classificationReason: "Valid request",
});

export const sqsMessagesMock = {
  validMessage: {
    Records: [
      {
        s3: {
          object: {
            key: "alb-logs.json",
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
