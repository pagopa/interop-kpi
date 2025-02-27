import { LoadBalancerLog } from "./load-balancer-log.js";

export const LoadBalancerLogTable = {
  logs: "load_balancer_logs",
} as const;

export type LoadBalancerLogTable =
  (typeof LoadBalancerLogTable)[keyof typeof LoadBalancerLogTable];

export interface LoadBalancerLogSchema {
  type: string;
  time: Date;
  elb: string;
  client_ip: string;
  client_port: string;
  target_ip?: string;
  target_port?: string;
  request_processing_time: string;
  target_processing_time: string;
  response_processing_time: string;
  elb_status_code: string;
  target_status_code?: string;
  received_bytes: string;
  sent_bytes: string;
  request: string;
  user_agent: string;
  ssl_cipher?: string;
  ssl_protocol?: string;
}

export type LoadBalancerLogMapping = {
  [K in keyof LoadBalancerLogSchema]: (
    record: LoadBalancerLog
  ) => LoadBalancerLogSchema[K];
};
