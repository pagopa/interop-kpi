import { z } from "zod";

export const applicationAuditPhase = {
  BEGIN_REQUEST: "BEGIN_REQUEST",
  END_REQUEST: "END_REQUEST",
} as const;

export const ApplicationAuditPhase = z.enum([
  applicationAuditPhase.BEGIN_REQUEST,
  applicationAuditPhase.END_REQUEST,
]);

export const applicationAuditService = {
  BFF: "backend-for-frontend",
  AUTH_SERVER: "authorization-server",
} as const;

export const ApplicationAuditService = z.enum([
  applicationAuditService.BFF,
  applicationAuditService.AUTH_SERVER,
]);

export const applicationAuditEndppoint = {
  SESSION_TOKENS: "/session/tokens",
} as const;

export const ApplicationAuditEndppoint = z.enum([
  applicationAuditEndppoint.SESSION_TOKENS,
]);

export type ApplicationAuditPhase = z.infer<typeof ApplicationAuditPhase>;

export const ApplicationAuditBeginRequest = z.object({
  correlationId: z.string(),
  spanId: z.string(),
  service: z.string(),
  serviceVersion: z.string(),
  endpoint: z.string(),
  httpMethod: z.string(),
  phase: z.literal(applicationAuditPhase.BEGIN_REQUEST),
  requesterIpAddress: z.string().optional(),
  nodeIp: z.string(),
  podName: z.string(),
  uptimeSeconds: z.number(),
  timestamp: z.number(),
  amazonTraceId: z.string().optional(),
});
export type ApplicationAuditBeginRequest = z.infer<
  typeof ApplicationAuditBeginRequest
>;

export const ApplicationAuditEndRequest = ApplicationAuditBeginRequest.extend({
  phase: z.literal(applicationAuditPhase.END_REQUEST),
  organizationId: z.string().optional(),
  userId: z.string().optional(),
  httpResponseStatus: z.number(),
  executionTimeMs: z.number(),
});
export type ApplicationAuditEndRequest = z.infer<
  typeof ApplicationAuditEndRequest
>;

export const ApplicationAuditEndRequestAuthServer =
  ApplicationAuditEndRequest.omit({ userId: true }).extend({
    service: z.literal(applicationAuditService.AUTH_SERVER),
    clientId: z.string().optional(),
  });
export type ApplicationAuditEndRequestAuthServer = z.infer<
  typeof ApplicationAuditEndRequestAuthServer
>;

export const ApplicationAuditEndRequestSessionTokenExchange =
  ApplicationAuditEndRequest.omit({ userId: true }).extend({
    service: z.literal(applicationAuditService.BFF),
    endpoint: z.literal(applicationAuditEndppoint.SESSION_TOKENS),
    selfcareId: z.string().optional(),
  });
export type ApplicationAuditEndRequestSessionTokenExchange = z.infer<
  typeof ApplicationAuditEndRequestSessionTokenExchange
>;

const EndRequestEvent = z.union([
  ApplicationAuditEndRequestAuthServer,
  ApplicationAuditEndRequestSessionTokenExchange,
  ApplicationAuditEndRequest,
]);

export const ApplicationAuditEvent = z.union([
  ApplicationAuditBeginRequest,
  EndRequestEvent,
]);

export type ApplicationAuditEvent = z.infer<typeof ApplicationAuditEvent>;

export function isEndRequestSessionTokenExchange(
  data: ApplicationAuditEvent
): data is ApplicationAuditEndRequestSessionTokenExchange {
  return (
    data.phase === applicationAuditPhase.END_REQUEST &&
    data.service === applicationAuditService.BFF &&
    data.endpoint === applicationAuditEndppoint.SESSION_TOKENS
  );
}

export function isEndRequestAuthServer(
  data: ApplicationAuditEvent
): data is ApplicationAuditEndRequestAuthServer {
  return (
    data.phase === applicationAuditPhase.END_REQUEST &&
    data.service === applicationAuditService.AUTH_SERVER
  );
}
