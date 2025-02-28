import { PassThrough } from "stream";
import { describe, expect, it, vi, afterEach } from "vitest";
import { FileManager, Logger } from "pagopa-interop-kpi-commons";
import { config } from "../src/config/config.js";
import { albLogsAuditServiceBuilder } from "../src/services/albLogsAuditService.js";
import { getMockAuditMessage } from "./utils.js";

const createStreamWithData = (data: string): PassThrough => {
  const stream = new PassThrough();
  stream.end(data);
  return stream;
};

const validJson = JSON.stringify([getMockAuditMessage()]);
const emptyJson = "[]";
const invalidJson = "invalid-json";

const baseFileManager: FileManager = {
  delete: vi.fn().mockResolvedValue(undefined),
  storeBytes: vi.fn().mockResolvedValue("mock-key"),
  get: vi.fn().mockResolvedValue(createStreamWithData(validJson)),
  listFiles: vi.fn().mockResolvedValue(["file1", "file2"]),
};

const baseDbService = {
  insertRecordsToStaging: vi.fn().mockResolvedValue(undefined),
  mergeStagingToTarget: vi.fn().mockResolvedValue(undefined),
  cleanStaging: vi.fn().mockResolvedValue(undefined),
};

const baseLogger: Logger = {
  isDebugEnabled: vi.fn().mockReturnValue(true),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

describe("ALB Logs Audit Service", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("handleMessage", () => {
    it("should process a valid S3 key successfully", async () => {
      const service = albLogsAuditServiceBuilder(
        baseDbService,
        baseFileManager
      );
      const s3Key = "valid-s3-key";

      await expect(
        service.handleMessage(s3Key, baseLogger)
      ).resolves.not.toThrow();

      expect(baseFileManager.get).toHaveBeenCalledWith(
        config.s3Bucket,
        s3Key,
        baseLogger
      );
      expect(baseDbService.insertRecordsToStaging).toHaveBeenCalled();
      expect(baseDbService.mergeStagingToTarget).toHaveBeenCalled();
      expect(baseDbService.cleanStaging).toHaveBeenCalled();
      expect(baseLogger.info).toHaveBeenCalledWith(
        `Staging cleanup completed for file: ${s3Key}`
      );
    });

    it("should throw an error if the file stream emits an error", async () => {
      const errorStream = new PassThrough();
      const streamError = new Error("Stream error");
      process.nextTick(() => errorStream.emit("error", streamError));

      const fileManagerWithError: FileManager = {
        ...baseFileManager,
        get: vi.fn().mockResolvedValue(errorStream),
      };

      const service = albLogsAuditServiceBuilder(
        baseDbService,
        fileManagerWithError
      );
      const s3Key = "error-s3-key";

      await expect(service.handleMessage(s3Key, baseLogger)).rejects.toThrow(
        "Stream error"
      );
    });

    it("should throw an error for invalid JSON content", async () => {
      const fileManagerWithInvalidJson: FileManager = {
        ...baseFileManager,
        get: vi.fn().mockResolvedValue(createStreamWithData(invalidJson)),
      };

      const service = albLogsAuditServiceBuilder(
        baseDbService,
        fileManagerWithInvalidJson
      );
      const s3Key = "invalid-json-key";

      await expect(service.handleMessage(s3Key, baseLogger)).rejects.toThrow();
    });

    it("should handle an empty JSON array correctly", async () => {
      const fileManagerWithEmptyJson: FileManager = {
        ...baseFileManager,
        get: vi.fn().mockResolvedValue(createStreamWithData(emptyJson)),
      };

      const service = albLogsAuditServiceBuilder(
        baseDbService,
        fileManagerWithEmptyJson
      );
      const s3Key = "empty-json-key";

      await expect(
        service.handleMessage(s3Key, baseLogger)
      ).resolves.not.toThrow();

      expect(baseDbService.insertRecordsToStaging).not.toHaveBeenCalled();
      expect(baseDbService.mergeStagingToTarget).toHaveBeenCalled();
      expect(baseDbService.cleanStaging).toHaveBeenCalled();
    });
  });
});
