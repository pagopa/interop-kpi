import { InternalError, parseErrorMessage } from "pagopa-interop-kpi-models";

type FileManagerErrorCode = "fileManagerGetError";

export class FileManagerError extends InternalError<FileManagerErrorCode> {
  constructor({
    code,
    detail,
  }: {
    code: FileManagerErrorCode;
    detail: string;
  }) {
    super({ code, detail });
  }
}

export function fileManagerGetError(
  bucket: string,
  path: string,
  error: unknown
): FileManagerError {
  return new FileManagerError({
    code: "fileManagerGetError",
    detail: `Error getting file ${path} in bucket ${bucket}: ${parseErrorMessage(
      error
    )}`,
  });
}
