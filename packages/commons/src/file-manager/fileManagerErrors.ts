import { InternalError, parseErrorMessage } from "pagopa-interop-kpi-models";

type FileManagerErrorCode =
  | "fileManagerGetError"
  | "fileManagerListFilesError"
  | "fileManagerStoreBytesError"
  | "fileManagerDeleteError";

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

export function fileManagerListFilesError(
  bucket: string,
  error: unknown
): FileManagerError {
  return new FileManagerError({
    code: "fileManagerListFilesError",
    detail: `Error listing files in bucket ${bucket}: ${parseErrorMessage(
      error
    )}`,
  });
}

export function fileManagerStoreBytesError(
  key: string,
  bucket: string,
  error: unknown
): FileManagerError {
  return new FileManagerError({
    code: "fileManagerStoreBytesError",
    detail: `Error storing file ${key} in bucket ${bucket}: ${parseErrorMessage(
      error
    )}`,
  });
}

export function fileManagerDeleteError(
  path: string,
  bucket: string,
  error: unknown
): FileManagerError {
  return new FileManagerError({
    code: "fileManagerDeleteError",
    detail: `Error deleting file ${path} from bucket ${bucket}: ${parseErrorMessage(
      error
    )}`,
  });
}
