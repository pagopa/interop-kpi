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
  kafkaMissingMessagesValue: "KAFKA_MISSING_MESSAGES_VALUE",
  kafkaMessageProcessError: "KAFKA_MESSAGE_PROCESS_ERROR",
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

export function kafkaMessageProcessError(
  topic: string,
  partition: number,
  offset: string,
  error?: unknown
): InternalError<CommonErrorCodes> {
  return new InternalError({
    code: "kafkaMessageProcessError",
    detail: `Error while handling kafka message from topic : ${topic} - partition ${partition} - offset ${offset}. ${
      error ? parseErrorMessage(error) : ""
    }`,
  });
}

export function kafkaMissingMessagesValue(
  topic: string
): InternalError<CommonErrorCodes> {
  return new InternalError({
    code: "kafkaMissingMessagesValue",
    detail: `Missing value messages in kafka batch from topic: ${topic}`,
  });
}
