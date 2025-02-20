import { InternalError } from "pagopa-interop-kpi-models";

export const errorCodes = {
  decodeSQSEventMessageError: "DECODE_SQS_EVENT_MESSAGE_ERROR",
} as const;

export type ErrorCodes = keyof typeof errorCodes;

export function decodeSQSEventMessageError(
  messageId: string | undefined,
  detail: unknown
): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `Failed to decode SQS S3 event message with MessageId: ${messageId}. Details: ${detail}`,
    code: "decodeSQSEventMessageError",
  });
}
