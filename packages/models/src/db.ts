export const JwtDbTable = {
  client_assertion: "client_assertion_audit",
  generated_token: "generated_token_audit",
} as const;

export type JwtDbTable = (typeof JwtDbTable)[keyof typeof JwtDbTable];

export const ApplicationDbTable = {
  begin_request: "begin_request_audit",
  end_request: "end_request_audit",
  end_request_session_token_exchange:
    "end_request_session_token_exchange_audit",
  end_request_auth_server: "end_request_auth_server_audit",
} as const;

export type ApplicationDbTable =
  (typeof ApplicationDbTable)[keyof typeof ApplicationDbTable];
export const LoadBalancerLogTable = {
  logs: "alb_logs_audit",
} as const;

export type LoadBalancerLogTable =
  (typeof LoadBalancerLogTable)[keyof typeof LoadBalancerLogTable];
