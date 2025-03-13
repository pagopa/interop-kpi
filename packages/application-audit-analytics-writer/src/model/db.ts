import {
  ApplicationAuditBeginRequest,
  ApplicationAuditEndRequest,
} from "pagopa-interop-kpi-models";

export interface ApplicationAuditBeginRequestSchema {
  correlation_id: string;
  service: string;
  service_version: string;
  endpoint: string;
  http_method: string;
  phase: "BEGIN_REQUEST";
  requester_ip_address: string;
  node_ip: string;
  pod_name: string;
  uptime_seconds: number;
  timestamp: Date;
  amazon_trace_id: string;
}

export interface ApplicationAuditEndRequestSchema
  extends Omit<ApplicationAuditBeginRequestSchema, "phase"> {
  phase: "END_REQUEST";
  organization_id: string;
  user_id?: string;
  http_response_status: number;
  execution_time_ms: number;
}

/**
 * ApplicationAuditBeginRequestMapping is a type alias that defines a mapping interface to convert
 * a ApplicationAuditBeginRequest event into a shape that conforms to ApplicationAuditBeginRequestSchema.
 * It ensures that the output of each mapping function exactly matches the expected type
 * for the corresponding column defined in ApplicationAuditBeginRequestSchema.
 */
export type ApplicationAuditBeginRequestMapping = {
  [K in keyof ApplicationAuditBeginRequestSchema]: (
    event: ApplicationAuditBeginRequest
  ) => ApplicationAuditBeginRequestSchema[K];
};

/**
 * ApplicationAuditEndRequestMapping is a type alias that defines a mapping interface to convert
 * a ApplicationAuditEndRequest event into a shape that conforms to ApplicationAuditEndRequestSchema.
 * It ensures that the output of each mapping function exactly matches the expected type
 * for the corresponding column defined in ApplicationAuditEndRequestSchema.
 */
export type ApplicationAuditEndRequestMapping = {
  [K in keyof ApplicationAuditEndRequestSchema]: (
    event: ApplicationAuditEndRequest
  ) => ApplicationAuditEndRequestSchema[K];
};
