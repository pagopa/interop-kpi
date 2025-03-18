import { describe, it, expect, vi } from "vitest";
import { compressJson } from "../src/utilities/compression.js";
import { handleMessages } from "../src/handler/messagesHandler.js";
import { genericLogger, formatTimehhmmss } from "pagopa-interop-kpi-commons";
import {
  fileManager,
  validKafkaMessage,
  invalidKafkaMessage,
  validAuditEvent,
} from "./utils.js";
import { createGunzip } from "zlib";
import { pipeline, Readable } from "stream";
import { promisify } from "util";
import { ApplicationAuditEvent, Message } from "pagopa-interop-kpi-models";

const pipelineAsync = promisify(pipeline);

describe("handleMessages", () => {
  it("should compress successfully a valid JSON string", async () => {
    const jsonString = JSON.stringify(validAuditEvent);
    const compressedBuffer = await compressJson(jsonString);
    expect(Buffer.isBuffer(compressedBuffer)).toBe(true);

    const gunzip = createGunzip();
    let decompressed = "";
    gunzip.on("data", (chunk) => (decompressed += chunk.toString()));
    await pipelineAsync(Readable.from(compressedBuffer), gunzip);
    expect(decompressed).toBe(jsonString);
  });
  it("should process a single valid message and store on s3bucket with valid name", async () => {
    const mockStoreBytes = vi.fn().mockResolvedValue("mocked-s3-key");
    fileManager.storeBytes = mockStoreBytes;

    const fakeDate = new Date("2025-03-18T12:34:56");
    vi.useFakeTimers();
    vi.setSystemTime(fakeDate);

    await handleMessages([validKafkaMessage], fileManager, genericLogger);

    const s3File = mockStoreBytes.mock.calls[0][0];
    const year = fakeDate.getFullYear();
    const month = String(fakeDate.getMonth() + 1).padStart(2, "0");
    const day = String(fakeDate.getDate()).padStart(2, "0");
    const time = formatTimehhmmss(fakeDate);

    expect(s3File.path).toBe(`year=${year}/month=${month}/day=${day}`);
    expect(s3File.name).toContain(`${year}${month}${day}_${time}_`);
    expect(mockStoreBytes).toHaveBeenCalledWith(s3File, genericLogger);
  });

  it("should process an empty messages array", async () => {
    const mockStoreBytes = vi.fn().mockResolvedValue("mocked-s3-key");
    fileManager.storeBytes = mockStoreBytes;

    const fakeDate = new Date("2025-03-18T12:34:56");
    vi.useFakeTimers();
    vi.setSystemTime(fakeDate);

    await handleMessages([], fileManager, genericLogger);

    expect(mockStoreBytes).toHaveBeenCalledTimes(1);
  });

  it("should process multiple valid messages", async () => {
    const mockStoreBytes = vi.fn().mockResolvedValue("mocked-s3-key");
    fileManager.storeBytes = mockStoreBytes;

    const fakeDate = new Date("2025-03-18T12:34:56");
    vi.useFakeTimers();
    vi.setSystemTime(fakeDate);

    await handleMessages(
      [validKafkaMessage, validKafkaMessage],
      fileManager,
      genericLogger
    );

    const s3File = mockStoreBytes.mock.calls[0][0];
    const gunzip = createGunzip();
    let decompressed = "";
    gunzip.on("data", (chunk) => (decompressed += chunk.toString()));
    await pipelineAsync(Readable.from(s3File.content), gunzip);
    const parsed = JSON.parse(decompressed);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(2);
    expect(mockStoreBytes).toHaveBeenCalledTimes(1);
  });

  it("should throw genericInternalError if storeBytes fails", async () => {
    fileManager.storeBytes = vi
      .fn()
      .mockRejectedValue(new Error("mocked error"));
    await expect(
      handleMessages([validKafkaMessage], fileManager, genericLogger)
    ).rejects.toThrowError(/Write operation failed - mocked error/);
  });

  it("should throw genericInternalError if message is invalid", async () => {
    const mockStoreBytes = vi.fn().mockResolvedValue("mocked-s3-key");
    fileManager.storeBytes = mockStoreBytes;
    const errorMessage = Message(ApplicationAuditEvent).safeParse(
      invalidKafkaMessage
    ).error;
    await expect(
      handleMessages([invalidKafkaMessage], fileManager, genericLogger)
    ).rejects.toThrowError(
      `Write operation failed - Invalid message: ${JSON.stringify(
        errorMessage
      )}`
    );
  });
});
