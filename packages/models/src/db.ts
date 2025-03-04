export const JwtGeneratedDbTable = {
  client_assertion: "client_assertion_audit_details",
  generated_token: "generated_token_audit_details",
} as const;

export type JwtGeneratedDbTable =
  (typeof JwtGeneratedDbTable)[keyof typeof JwtGeneratedDbTable];
