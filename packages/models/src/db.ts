export const JwtDbTable = {
  client_assertion: "client_assertion_audit",
  generated_token: "generated_token_audit",
} as const;

export type JwtDbTable = (typeof JwtDbTable)[keyof typeof JwtDbTable];

export const LoadBalancerLogTable = {
  logs: "alb_logs",
} as const;

export type LoadBalancerLogTable =
  (typeof LoadBalancerLogTable)[keyof typeof LoadBalancerLogTable];
