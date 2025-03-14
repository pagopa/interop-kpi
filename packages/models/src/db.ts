export const JwtDbTable = {
  client_assertion: "client_assertion_audit_details",
  generated_token: "generated_token_audit_details",
} as const;

export type JwtDbTable = (typeof JwtDbTable)[keyof typeof JwtDbTable];

export const ApplicationDbTable = {
  begin_request: "begin_request_audit",
  end_request: "end_request_audit",
} as const;

export type ApplicationDbTable =
  (typeof ApplicationDbTable)[keyof typeof ApplicationDbTable];
export const LoadBalancerLogTable = {
  logs: "alb_logs",
} as const;

export type LoadBalancerLogTable =
  (typeof LoadBalancerLogTable)[keyof typeof LoadBalancerLogTable];
