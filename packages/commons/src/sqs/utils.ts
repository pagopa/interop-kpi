import {
  decodeSQSEventMessageError,
  S3BodySchema,
} from "pagopa-interop-kpi-models";
import { SQS } from "./index.js";

export function decodeSQSEventMessage(message: SQS.Message): string {
  try {
    if (!message.Body) {
      throw new Error("Message body is undefined");
    }

    const s3Body: S3BodySchema = JSON.parse(message.Body);
    if (!s3Body.Records?.length) {
      throw new Error("S3Body doesn't contain records");
    }

    const key = s3Body.Records[0].s3.object.key;
    if (!key) {
      throw new Error(`S3 key must not be empty`);
    }

    return key;
  } catch (error: unknown) {
    throw decodeSQSEventMessageError(message.MessageId, error);
  }
}

export const elapsedTime = (startTime: number): string => {
  const elapsed = Date.now() - startTime;
  return elapsed > 1000
    ? `[TIME: ${(elapsed / 1000).toFixed(2)}s]`
    : `[TIME: ${elapsed}ms]`;
};
