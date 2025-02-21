import { describe, expect, it, vi, afterAll } from "vitest";
import {
  SQS,
  decodeSQSEventMessageError,
  ErrorCodes,
} from "pagopa-interop-kpi-commons";
import { InternalError } from "pagopa-interop-kpi-models";
import { processMessage } from "../src/handlers/messageHandler.js";
import { sqsMessagesMock } from "./utils.js";

describe("JWT Audit Service tests", () => {
  const mockJwtAuditService = {
    handleMessage: vi.fn().mockResolvedValue(undefined),
  };

  vi.mock("pagopa-interop-kpi-models", async () => {
    const actual = await vi.importActual<
      typeof import("pagopa-interop-kpi-models")
    >("pagopa-interop-kpi-models");

    return {
      ...actual,
      generateId: vi.fn(() => "mocked-uuid-value"),
    };
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe("decodeSQSEventMessage", () => {
    it("given valid message, method should call handleMessage", async () => {
      const validMessage: SQS.Message = {
        MessageId: "12345",
        ReceiptHandle: "receipt_handle_id",
        Body: JSON.stringify(sqsMessagesMock.validMessage),
      };

      expect(() =>
        processMessage(mockJwtAuditService)(validMessage)
      ).not.toThrowError();

      expect(mockJwtAuditService.handleMessage).toHaveBeenCalledOnce();
    });

    it("given invalid message, method should throw an error", async () => {
      const invalidMessage = {};

      try {
        await processMessage(mockJwtAuditService)(invalidMessage);
      } catch (error) {
        expect(error).toBeInstanceOf(InternalError);
        expect((error as InternalError<ErrorCodes>).code).toBe(
          "decodeSQSEventMessageError"
        );
      }
    });

    it("given undefined Body message, method should throw an error", async () => {
      const missingBodyMessage: SQS.Message = {
        MessageId: "12345",
        ReceiptHandle: "receipt_handle_id",
        Body: undefined,
      };

      await expect(
        processMessage(mockJwtAuditService)(missingBodyMessage)
      ).rejects.toThrowError(
        decodeSQSEventMessageError(
          missingBodyMessage.MessageId,
          new Error("Message body is undefined")
        )
      );
    });

    it("given empty S3 key message, method should throw an error", async () => {
      const emptyS3KeyMessage: SQS.Message = {
        MessageId: "12345",
        ReceiptHandle: "receipt_handle_id",
        Body: JSON.stringify(sqsMessagesMock.emptyS3KeyMessage),
      };

      await expect(
        processMessage(mockJwtAuditService)(emptyS3KeyMessage)
      ).rejects.toThrowError(
        decodeSQSEventMessageError(
          emptyS3KeyMessage.MessageId,
          new Error(`S3 key must not be empty`)
        )
      );
    });

    it("given empty S3 records message, method should throw an error", async () => {
      const emptyS3RecordsMessage: SQS.Message = {
        MessageId: "12345",
        ReceiptHandle: "receipt_handle_id",
        Body: JSON.stringify(sqsMessagesMock.emptyS3RecordsMessage),
      };

      await expect(
        processMessage(mockJwtAuditService)(emptyS3RecordsMessage)
      ).rejects.toThrowError(
        decodeSQSEventMessageError(
          emptyS3RecordsMessage.MessageId,
          new Error("S3Body doesn't contain records")
        )
      );
    });
  });
});
