import { PassThrough } from "stream";
import { gzipSync } from "zlib";
import { describe, expect, it, vi, afterEach } from "vitest";
import { FileManager, Logger } from "pagopa-interop-kpi-commons";
import { config } from "../src/config/config.js";
import { albLogsAuditServiceBuilder } from "../src/services/albLogsAuditService.js";

const createGzipStream = (data: string): PassThrough => {
  const stream = new PassThrough();
  stream.end(gzipSync(data));
  return stream;
};

const validLogEntries = new Array(5)
  .fill(
    `http 2024-03-01T12:00:00Z app/my-loadbalancer/xyz 192.168.1.1:443 10.0.0.1:80 0.000 0.001 0.000 200 200 34 366 "GET http://example.com HTTP/1.1" "Mozilla/5.0" - - arn:aws:elasticloadbalancing:us-east-2:xyz "Root=1-abc" "-" "-" 0 2024-03-01T12:00:00Z "forward" "-" "-" "10.0.0.1:80" "200" "-" "-" "TID-12345"`
  )
  .join("\n");

const validGzData = createGzipStream(validLogEntries);
const emptyGzData = createGzipStream(""); // Ensure empty files are correctly compressed

const mockFileManager: FileManager = {
  delete: vi.fn().mockResolvedValue(undefined),
  storeBytes: vi.fn().mockResolvedValue("mock-key"),
  get: vi.fn().mockResolvedValue(validGzData),
  listFiles: vi.fn().mockResolvedValue(["file1", "file2"]),
};

const mockDbService = {
  insertRecordsToStaging: vi.fn().mockResolvedValue(undefined),
  mergeStagingToTarget: vi.fn().mockResolvedValue(undefined),
  cleanStaging: vi.fn().mockResolvedValue(undefined),
};

const mockLogger: Logger = {
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

  const service = albLogsAuditServiceBuilder(mockDbService, mockFileManager);

  it("should process a valid .gz log file", async () => {
    const s3Key = "logs/sample.gz";

    await expect(
      service.handleMessage(s3Key, mockLogger)
    ).resolves.not.toThrow();

    expect(mockFileManager.get).toHaveBeenCalledWith(
      config.s3Bucket,
      s3Key,
      mockLogger
    );
    expect(mockDbService.insertRecordsToStaging).toHaveBeenCalled();
    expect(mockDbService.mergeStagingToTarget).toHaveBeenCalled();
    expect(mockDbService.cleanStaging).toHaveBeenCalled();
  });

  it("should throw an error if the file is not .gz", async () => {
    const s3Key = "logs/sample.txt";

    await expect(service.handleMessage(s3Key, mockLogger)).rejects.toThrow(
      "Unsupported file format: logs/sample.txt. Only .gz files are allowed."
    );
  });

  it("should handle an empty .gz log file correctly", async () => {
    const fileManagerWithEmptyData: FileManager = {
      ...mockFileManager,
      get: vi.fn().mockResolvedValue(emptyGzData),
    };

    const serviceWithEmptyFile = albLogsAuditServiceBuilder(
      mockDbService,
      fileManagerWithEmptyData
    );
    const s3Key = "logs/empty.gz";

    await expect(
      serviceWithEmptyFile.handleMessage(s3Key, mockLogger)
    ).resolves.not.toThrow();

    expect(mockDbService.insertRecordsToStaging).not.toHaveBeenCalled();
    expect(mockDbService.mergeStagingToTarget).toHaveBeenCalled();
    expect(mockDbService.cleanStaging).toHaveBeenCalled();
  });
});
