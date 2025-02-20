import { GeneratedTokenAuditDetails } from "pagopa-interop-kpi-models";

type TopLevelKeys<T> = keyof T & string;

type FirstLevelNestedKeys<T> = {
  [K in keyof T & string]: T[K] extends object
    ? `${K}.${Extract<keyof T[K], string>}`
    : never;
}[keyof T & string];

export type ValidTokenAuditProperty =
  | TopLevelKeys<GeneratedTokenAuditDetails>
  | FirstLevelNestedKeys<GeneratedTokenAuditDetails>;

export interface TokenAuditColumn {
  name: string;
  property: ValidTokenAuditProperty;
}
