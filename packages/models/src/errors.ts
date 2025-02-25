import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

export class InternalError<T> extends Error {
  public code: T;
  public detail: string;

  constructor({ code, detail }: { code: T; detail: string }) {
    super(detail);
    this.code = code;
    this.detail = detail;
  }
}

const errorCodes = {
  genericError: "GENERIC_ERROR",
  decodeSQSEventMessageError: "DECODE_SQS_EVENT_MESSAGE_ERROR",
} as const;

export type CommonErrorCodes = keyof typeof errorCodes;

export function parseErrorMessage(error: unknown): string {
  if (error instanceof ZodError) {
    return fromZodError(error).message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return `${JSON.stringify(error)}`;
}

/* ===== Internal Error ===== */

export function genericInternalError(
  details: string
): InternalError<CommonErrorCodes> {
  return new InternalError({
    code: "genericError",
    detail: details,
  });
}

export function decodeSQSEventMessageError(
  messageId: string | undefined,
  detail: unknown
): InternalError<CommonErrorCodes> {
  return new InternalError({
    detail: `Failed to decode SQS S3 event message with MessageId: ${messageId}. Details: ${detail}`,
    code: "decodeSQSEventMessageError",
  });
}
