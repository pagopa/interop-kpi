import { KafkaMessage } from "kafkajs";
import { setupTestContainersVitest } from "pagopa-interop-kpi-commons-test/index.js";
import {
  ApplicationAuditEvent,
  applicationAuditPhase,
} from "pagopa-interop-kpi-models";
import { inject } from "vitest";

export const { fileManager, postgresDB } = await setupTestContainersVitest(
  undefined,
  inject("fileManagerConfig")
);

export const validAuditEvent: ApplicationAuditEvent = {
  correlationId: "corr-123",
  service: "test-service",
  serviceVersion: "1.0.0",
  endpoint: "/api/test",
  httpMethod: "GET",
  phase: applicationAuditPhase.BEGIN_REQUEST,
  requesterIpAddress: "127.0.0.1",
  nodeIp: "192.168.1.10",
  podName: "pod-1",
  uptimeSeconds: 3600,
  timestamp: Date.now(),
  amazonTraceId: "trace-123",
};

export const validKafkaMessage: KafkaMessage = {
  key: Buffer.from("key1"),
  value: Buffer.from(JSON.stringify(validAuditEvent)),
  timestamp: new Date().toISOString(),
  offset: "0",
  attributes: 0,
  headers: {},
};

export const invalidAuditEvent = {
  correlationId: "corr-invalid",
  service: "test-service",
  phase: applicationAuditPhase.BEGIN_REQUEST,
};

export const invalidKafkaMessage: KafkaMessage = {
  key: Buffer.from("key-invalid"),
  value: Buffer.from(JSON.stringify(invalidAuditEvent)),
  timestamp: new Date().toISOString(),
  offset: "0",
  attributes: 0,
  headers: {},
};
