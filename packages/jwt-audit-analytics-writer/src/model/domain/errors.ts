import { InternalError } from "pagopa-interop-kpi-models";

export const errorCodes = {
  insertStagingRecordsError: "INSERT_STAGING_RECORDS_ERROR",
  mergeDataError: "MERGE_DATA_ERROR",
} as const;

export type ErrorCodes = keyof typeof errorCodes;

export function insertStagingRecordsError(
  detail: unknown
): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `Database error inserting staging records: ${detail}`,
    code: "insertStagingRecordsError",
  });
}

export function mergeDataError(detail: unknown): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `Database error merging data: ${detail}`,
    code: "mergeDataError",
  });
}
