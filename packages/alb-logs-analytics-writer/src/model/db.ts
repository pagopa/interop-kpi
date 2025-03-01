import { LoadBalancerLog } from "./load-balancer-log.js";

export const LoadBalancerLogTable = {
  logs: "load_balancer_logs",
} as const;

export type LoadBalancerLogTable =
  (typeof LoadBalancerLogTable)[keyof typeof LoadBalancerLogTable];

export interface LoadBalancerLogSchema {
  type: string;
  time: string;
  elb: string;
  client: string;
  target: string;
  request_processing_time: string;
  target_processing_time: string;
  response_processing_time: string;
  elb_status_code: string;
  target_status_code: string;
  received_bytes: string;
  sent_bytes: string;
  request: string;
  user_agent: string;
  ssl_cipher: string;
  ssl_protocol: string;
  target_group_arn: string;
  trace_id: string;
  domain_name: string;
  chosen_cert_arn: string;
  matched_rule_priority: string;
  request_creation_time: string;
  actions_executed: string;
  redirect_url: string;
  error_reason: string;
  target_port_list: string;
  target_status_code_list: string;
  classification: string;
  classification_reason: string;
  conn_trace_id?: string;
}

export type LoadBalancerLogMapping = {
  [K in keyof LoadBalancerLogSchema]: (
    record: LoadBalancerLog
  ) => LoadBalancerLogSchema[K];
};
