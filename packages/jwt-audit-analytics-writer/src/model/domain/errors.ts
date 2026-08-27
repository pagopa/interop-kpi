import { InternalError } from "pagopa-interop-kpi-models";

export const errorCodes = {
  setupStagingTablesError: "SETUP_STAGING_TABLES_ERROR",
} as const;

export type ErrorCodes = keyof typeof errorCodes;

export function setupStagingTablesError(
  detail: unknown
): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `Database error occurred while setting up staging tables. ${detail}`,
    code: "setupStagingTablesError",
  });
}
